from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Usuario personalizado. El email es el identificador principal para login.
    El username es el nombre visible en el ranking.
    """
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    # ID de Google para los usuarios que se registran con OAuth
    google_id = models.CharField(max_length=200, blank=True, null=True, unique=True)

    USERNAME_FIELD = 'email'
    # username sigue siendo obligatorio (visible en ranking), pero el login es por email
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return self.username


class UserProfile(models.Model):
    """
    Estadísticas acumuladas del usuario a lo largo del tiempo.
    Se crea automáticamente al crear un CustomUser (via signal).
    """
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    movies_solved_count = models.PositiveIntegerField(default=0)
    current_streak = models.PositiveIntegerField(default=0)
    max_streak = models.PositiveIntegerField(default=0)
    total_points_all_time = models.PositiveIntegerField(default=0)
    last_played_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = 'Perfil de usuario'
        verbose_name_plural = 'Perfiles de usuarios'

    def __str__(self):
        return f"Perfil de {self.user.username}"
