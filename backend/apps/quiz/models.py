from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.users.models import CustomUser
from apps.movies.models import DailyTest
from .constants import SCORE_BY_CLUE


class GameSession(models.Model):
    """
    Una partida de un usuario (o anónimo) en un test diario.
    Un usuario/sesión solo puede tener una GameSession por DailyTest.
    """
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        null=True, blank=True, related_name='game_sessions',
        help_text="Null si el jugador no está logueado"
    )
    daily_test = models.ForeignKey(DailyTest, on_delete=models.CASCADE, related_name='sessions')

    # Clave de sesión para usuarios anónimos (guardada en localStorage del frontend)
    session_key = models.CharField(
        max_length=64, blank=True, db_index=True,
        help_text="Identificador de sesión anónima"
    )

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)

    # Progreso
    clues_revealed = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        help_text="Número de pistas reveladas hasta ahora (empieza en 1)"
    )

    # Resultado
    final_score = models.PositiveSmallIntegerField(default=0)
    movie_guessed = models.BooleanField(default=False)
    guessed_at_clue = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="En qué pista acertó el usuario (1-4). Null si no acertó"
    )

    class Meta:
        verbose_name = 'Sesión de juego'
        verbose_name_plural = 'Sesiones de juego'
        # Nota: La unicidad usuario+test se valida en la capa de la API (view/serializer)
        # porque MariaDB 10.4 no soporta constraints condicionales

    def __str__(self):
        player = self.user.username if self.user else f"anónimo({self.session_key[:8]})"
        return f"{player} — {self.daily_test.date} — {self.final_score}pts"

    def get_score_for_clue(self, clue_number):
        """Devuelve los puntos correspondientes a acertar en la pista dada."""
        return SCORE_BY_CLUE.get(clue_number, 0)


class GuessAttempt(models.Model):
    """
    Un intento de respuesta del usuario dentro de una GameSession.

    Flujo de intentos:
    - clue_number 1-4: un intento por pista revelada
    - clue_number 5: hasta 4 intentos finales tras ver todas las pistas (0 puntos)
    """
    game_session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='attempts')
    clue_number = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1-4: intento en la pista X. 5: intento final (sin puntos)"
    )
    attempt_text = models.CharField(max_length=300, help_text="Lo que escribió el usuario")
    is_correct = models.BooleanField(default=False)
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Intento de respuesta'
        verbose_name_plural = 'Intentos de respuesta'
        ordering = ['game_session', 'attempted_at']

    def __str__(self):
        resultado = 'Correcto' if self.is_correct else 'Incorrecto'
        return f"Pista {self.clue_number} — \"{self.attempt_text}\" — {resultado}"
