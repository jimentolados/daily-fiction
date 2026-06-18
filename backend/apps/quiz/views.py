from datetime import date, timezone as dt_timezone

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.movies.models import DailyTest
from apps.movies.serializers import ClueSerializer, MovieResultSerializer
from .models import GameSession, GuessAttempt
from .constants import MAX_FINAL_ATTEMPTS
from .scoring import calculate_score, is_correct_guess, update_user_stats
from .serializers import GameSessionSerializer


# ─── Helper: obtener o crear la sesión del usuario para el test de hoy ──────

def get_or_create_session(request, daily_test):
    """
    Para usuarios autenticados: busca por user + daily_test.
    Para anónimos: busca por session_key (enviado en header X-Session-Key).
    Si no existe, crea una nueva sesión.
    Devuelve (session, created).
    """
    if request.user.is_authenticated:
        return GameSession.objects.get_or_create(
            user=request.user,
            daily_test=daily_test,
            defaults={'session_key': '', 'clues_revealed': 1},
        )
    else:
        session_key = request.headers.get('X-Session-Key', '').strip()
        if not session_key:
            return None, False
        return GameSession.objects.get_or_create(
            user=None,
            daily_test=daily_test,
            session_key=session_key,
            defaults={'clues_revealed': 1},
        )


# ─── GET /api/v1/quiz/today/ ─────────────────────────────────────────────────

class TodayTestView(APIView):
    """
    Devuelve el estado actual del test del día para el usuario.
    Crea la GameSession si es la primera visita.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        today = date.today()

        try:
            daily_test = DailyTest.objects.select_related('movie').get(date=today, is_active=True)
        except DailyTest.DoesNotExist:
            return Response(
                {'error': 'No hay test disponible para hoy. ¡Vuelve mañana!'},
                status=status.HTTP_404_NOT_FOUND,
            )

        session, created = get_or_create_session(request, daily_test)

        if session is None:
            return Response(
                {'error': 'Incluye el header X-Session-Key para jugar sin cuenta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.daily_test = daily_test
        serializer = GameSessionSerializer(session, context={'request': request})
        return Response({
            'test_date': today.isoformat(),
            'session': serializer.data,
        })


# ─── POST /api/v1/quiz/today/guess/ ──────────────────────────────────────────

class SubmitGuessView(APIView):
    """
    Procesa un intento de respuesta del usuario.

    Flujo:
    - Si acierta → completa la sesión, suma puntos, actualiza estadísticas.
    - Si falla en pista 1-3 → revela la siguiente pista.
    - Si falla en pista 4 → activa los intentos finales (4 intentos, 0 puntos).
    - Si falla todos los intentos finales → revela la solución.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        today = date.today()
        attempt_text = request.data.get('attempt', '').strip()

        if not attempt_text:
            return Response(
                {'error': 'El campo "attempt" es obligatorio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            daily_test = DailyTest.objects.select_related('movie').get(
                date=today, is_active=True
            )
        except DailyTest.DoesNotExist:
            return Response(
                {'error': 'No hay test activo hoy.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        session, _ = get_or_create_session(request, daily_test)
        if session is None:
            return Response(
                {'error': 'Incluye el header X-Session-Key para jugar sin cuenta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if session.is_completed:
            return Response(
                {'error': 'Ya has completado el test de hoy.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        movie = daily_test.movie
        correct = is_correct_guess(attempt_text, movie)

        # Determinar el número de pista actual
        final_attempts_used = session.attempts.filter(clue_number=5).count()
        in_final_phase = (session.clues_revealed == 4 and
                          session.attempts.filter(clue_number=4).exists())

        clue_number = 5 if in_final_phase else session.clues_revealed

        # Validación: en fase final no puede superar MAX intentos
        if in_final_phase and final_attempts_used >= MAX_FINAL_ATTEMPTS:
            return Response(
                {'error': 'Ya has agotado todos tus intentos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Registrar el intento
        GuessAttempt.objects.create(
            game_session=session,
            clue_number=clue_number,
            attempt_text=attempt_text,
            is_correct=correct,
        )

        # ── ACIERTO ─────────────────────────────────────────────────────────
        if correct:
            score = calculate_score(clue_number)
            session.is_completed = True
            session.movie_guessed = True
            session.final_score = score
            session.guessed_at_clue = clue_number if clue_number <= 4 else None
            session.completed_at = timezone.now()
            session.save()

            if request.user.is_authenticated:
                update_user_stats(
                    user=request.user,
                    guessed_correctly=True,
                    score=score,
                    clue_number=clue_number,
                    completed_at=timezone.now(),
                )

            return Response({
                'correct': True,
                'score': score,
                'final_score': score,
                'movie': MovieResultSerializer(movie, context={'request': request}).data,
            })

        # ── FALLO ────────────────────────────────────────────────────────────

        # Fase de pistas normales (1-4): revelar la siguiente
        if not in_final_phase:
            if session.clues_revealed < 4:
                session.clues_revealed += 1
                session.save()
                next_clue = daily_test.clues.get(order=session.clues_revealed)
                return Response({
                    'correct': False,
                    'next_clue': ClueSerializer(next_clue, context={'request': request}).data,
                    'clues_revealed': session.clues_revealed,
                })
            else:
                # Fallado la pista 4 → entrar en fase final
                return Response({
                    'correct': False,
                    'all_clues_shown': True,
                    'remaining_final_attempts': MAX_FINAL_ATTEMPTS - 1,
                    'game_over': False,
                })

        # Fase final: comprobar si quedan intentos
        remaining = MAX_FINAL_ATTEMPTS - (final_attempts_used + 1)
        if remaining > 0:
            return Response({
                'correct': False,
                'all_clues_shown': True,
                'remaining_final_attempts': remaining,
                'game_over': False,
            })

        # ── GAME OVER: se agotaron todos los intentos finales ────────────────
        session.is_completed = True
        session.movie_guessed = False
        session.final_score = 0
        session.completed_at = timezone.now()
        session.save()

        if request.user.is_authenticated:
            update_user_stats(
                user=request.user,
                guessed_correctly=False,
                score=0,
                clue_number=clue_number,
                completed_at=timezone.now(),
            )

        return Response({
            'correct': False,
            'game_over': True,
            'movie': MovieResultSerializer(movie, context={'request': request}).data,
        })


# ─── GET /api/v1/quiz/today/result/ ──────────────────────────────────────────

class TodayResultView(APIView):
    """
    Devuelve el resultado del test de hoy si el usuario ya lo completó.
    Útil para mostrar el estado al volver a entrar a la página después de jugar.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        today = date.today()

        try:
            daily_test = DailyTest.objects.select_related('movie').get(date=today, is_active=True)
        except DailyTest.DoesNotExist:
            return Response(
                {'error': 'No hay test disponible hoy.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        session, _ = get_or_create_session(request, daily_test)
        if session is None:
            return Response({'played': False})

        if not session.is_completed:
            return Response({'played': False, 'in_progress': True})

        return Response({
            'played': True,
            'movie_guessed': session.movie_guessed,
            'final_score': session.final_score,
            'guessed_at_clue': session.guessed_at_clue,
            'movie': MovieResultSerializer(
                daily_test.movie, context={'request': request}
            ).data,
        })
