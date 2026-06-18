from django.db import models
from django.core.validators import MinValueValidator
from apps.users.models import CustomUser


class MonthlyScore(models.Model):
    """
    Puntuación acumulada de un usuario durante un mes concreto.
    Se reinicia el 1 de cada mes (los datos históricos se conservan).
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='monthly_scores')
    year = models.PositiveSmallIntegerField(db_index=True)
    month = models.PositiveSmallIntegerField(
        db_index=True,
        validators=[MinValueValidator(1)],
        help_text="1=Enero, 12=Diciembre"
    )
    total_score = models.PositiveIntegerField(default=0)
    games_played = models.PositiveSmallIntegerField(default=0)
    correct_guesses = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = 'Puntuación mensual'
        verbose_name_plural = 'Puntuaciones mensuales'
        unique_together = [('user', 'year', 'month')]
        ordering = ['-year', '-month', '-total_score']

    def __str__(self):
        return f"{self.user.username} — {self.month}/{self.year} — {self.total_score}pts"


class Achievement(models.Model):
    """
    Catálogo de todos los logros posibles de la aplicación.
    Los registros de esta tabla se crean manualmente o via fixtures.
    """
    class Category(models.TextChoices):
        RANKING = 'RANKING', 'Ranking'
        RACHA = 'RACHA', 'Racha'
        PRECISION = 'PRECISION', 'Precisión'
        ESPECIAL = 'ESPECIAL', 'Especial'

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(
        max_length=50, default='trophy',
        help_text="Nombre del icono SVG en assets/icons/"
    )
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.ESPECIAL)

    class Meta:
        verbose_name = 'Logro'
        verbose_name_plural = 'Logros'
        ordering = ['category', 'name']

    def __str__(self):
        return f"[{self.category}] {self.name}"


class UserAchievement(models.Model):
    """
    Relación entre usuario y logro obtenido.
    El campo metadata permite almacenar información dinámica como
    {"city": "Madrid", "month": "Marzo", "year": 2026}
    para construir textos como "Campeón de Madrid Marzo 2026".
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name='user_achievements')
    earned_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(
        default=dict, blank=True,
        help_text="Datos variables del logro: ciudad, mes, año, etc."
    )

    class Meta:
        verbose_name = 'Logro de usuario'
        verbose_name_plural = 'Logros de usuarios'
        ordering = ['-earned_at']
        # Un usuario puede ganar el mismo logro en distintos meses (ej: Campeón Enero, Campeón Febrero)
        # pero no el mismo logro con los mismos metadatos

    def __str__(self):
        return f"{self.user.username} — {self.achievement.name}"

    def get_display_name(self):
        """
        Construye el nombre del logro con los metadatos dinámicos.
        Ej: "Campeón de Madrid Marzo 2026"
        """
        name = self.achievement.name
        if self.metadata.get('city'):
            name += f" de {self.metadata['city']}"
        if self.metadata.get('month') and self.metadata.get('year'):
            name += f" {self.metadata['month']} {self.metadata['year']}"
        return name
