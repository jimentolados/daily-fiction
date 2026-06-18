import re
import unicodedata
from datetime import date

from apps.ranking.models import MonthlyScore, Achievement, UserAchievement
from .constants import SCORE_BY_CLUE, MAX_FINAL_ATTEMPTS


def calculate_score(clue_number):
    """Devuelve los puntos para acertar en la pista dada (0 si es intento final)."""
    return SCORE_BY_CLUE.get(clue_number, 0)


# ─── Comparación de títulos ──────────────────────────────────────────────────

def normalize_title(title):
    """
    Normaliza un título para comparación:
    - Elimina acentos y diacríticos
    - Convierte a minúsculas
    - Elimina puntuación
    - Colapsa espacios múltiples
    """
    if not title:
        return ''
    # Descomponer acentos (NFD) y eliminar diacríticos
    title = unicodedata.normalize('NFD', title)
    title = ''.join(c for c in title if unicodedata.category(c) != 'Mn')
    # Minúsculas, eliminar puntuación, colapsar espacios
    title = re.sub(r'[^\w\s]', '', title.lower())
    return ' '.join(title.split())


def is_correct_guess(attempt, movie):
    """
    Comprueba si el intento del usuario coincide con el título de la película.
    Compara con:
    - Título en castellano
    - Título original
    - Nombre de la franquicia (si está definido), ej: "Star Wars"
    """
    norm_attempt = normalize_title(attempt)
    if not norm_attempt:
        return False
    valid = [
        normalize_title(movie.title),
        normalize_title(movie.original_title),
    ]
    if movie.franchise_name:
        valid.append(normalize_title(movie.franchise_name))
    return norm_attempt in valid


# ─── Actualización de estadísticas al completar una partida ─────────────────

def update_user_stats(user, guessed_correctly, score, clue_number, completed_at):
    """
    Actualiza MonthlyScore y UserProfile cuando el usuario completa un test.
    Solo aplica a usuarios autenticados.
    """
    today = date.today()
    profile = user.profile

    # Actualizar puntuación mensual
    monthly, _ = MonthlyScore.objects.get_or_create(
        user=user,
        year=today.year,
        month=today.month,
        defaults={'total_score': 0, 'games_played': 0, 'correct_guesses': 0},
    )
    monthly.games_played += 1
    if guessed_correctly:
        monthly.total_score += score
        monthly.correct_guesses += 1
    monthly.save()

    if guessed_correctly:
        # Actualizar perfil
        profile.movies_solved_count += 1
        profile.total_points_all_time += score

        # Racha de días consecutivos
        if profile.last_played_date == today:
            pass  # Ya jugó hoy (no debería llegar aquí, pero por seguridad)
        elif profile.last_played_date and (today - profile.last_played_date).days == 1:
            profile.current_streak += 1
        else:
            profile.current_streak = 1

        profile.max_streak = max(profile.max_streak, profile.current_streak)
        profile.last_played_date = today
        profile.save()

        # Comprobar logros
        _check_achievements(user, profile, clue_number, completed_at)


def _check_achievements(user, profile, clue_number, completed_at):
    """Comprueba y otorga logros al usuario si se han cumplido las condiciones."""
    to_award = []

    if clue_number == 1:
        to_award.append('PISTA_1')

    if profile.current_streak >= 7:
        to_award.append('STREAK_7')
    if profile.current_streak >= 30:
        to_award.append('STREAK_30')

    if clue_number == 1 and profile.current_streak >= 7:
        from apps.quiz.models import GameSession
        last_7 = list(
            GameSession.objects
            .filter(user=user, is_completed=True, movie_guessed=True)
            .order_by('-completed_at')
            .values_list('guessed_at_clue', flat=True)[:7]
        )
        if len(last_7) == 7 and all(c == 1 for c in last_7):
            to_award.append('PERFECT_WEEK')

    if profile.movies_solved_count == 100:
        to_award.append('CENTURY')

    hour = completed_at.hour
    if hour < 8:
        to_award.append('EARLY_BIRD')
    if hour >= 23:
        to_award.append('NIGHT_OWL')

    if not to_award:
        return

    # Una sola query para obtener todos los logros necesarios
    achievements = {
        a.code: a
        for a in Achievement.objects.filter(code__in=to_award)
    }
    for code in to_award:
        achievement = achievements.get(code)
        if achievement:
            UserAchievement.objects.get_or_create(user=user, achievement=achievement)
