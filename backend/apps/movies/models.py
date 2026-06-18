from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.users.models import CustomUser
from .choices import ClueTypeCode


class Movie(models.Model):
    """
    Película candidata o ya usada como test diario.
    Se importa via APIs (TMDb + OMDb) y el admin selecciona cuáles usar.
    """
    # IDs externos para sincronizar con APIs
    tmdb_id = models.IntegerField(unique=True, null=True, blank=True)
    omdb_id = models.CharField(max_length=20, blank=True)  # ej: "tt0111161"

    # Información básica
    title = models.CharField(max_length=255)                # Título en castellano
    original_title = models.CharField(max_length=255, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    synopsis = models.TextField(blank=True)

    # Equipo artístico
    director = models.CharField(max_length=200, blank=True)
    lead_actor = models.CharField(max_length=200, blank=True)
    screenwriter = models.CharField(max_length=200, blank=True)

    # Datos técnicos
    duration_min = models.PositiveSmallIntegerField(null=True, blank=True)
    genre = models.CharField(max_length=150, blank=True)
    production_country = models.CharField(max_length=100, blank=True)

    # Puntuaciones y premios
    rt_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Puntuación en Rotten Tomatoes (0-100). Se importa automáticamente desde OMDb.'
    )
    oscar_nominations = models.PositiveSmallIntegerField(default=0)
    oscar_wins = models.PositiveSmallIntegerField(default=0)
    oscar_categories = models.JSONField(
        default=dict, blank=True,
        help_text='Dict {"won": [...], "nominated": [...]}. Se importa desde Wikidata.'
    )

    # Saga / franquicia (opcional)
    # Si se rellena, también se acepta este nombre como respuesta correcta.
    # Ej: "Star Wars" para "Star Wars: El Imperio Contraataca"
    franchise_name = models.CharField(
        max_length=255, blank=True,
        help_text="Nombre de la saga. Si se rellena, se acepta como respuesta alternativa."
    )

    # Recursos multimedia
    poster_url = models.URLField(max_length=500, blank=True)      # URL de TMDb
    iconic_quote = models.TextField(blank=True)

    # Control de estado (flujo de contenido)
    is_candidate = models.BooleanField(
        default=True,
        help_text="Importada de la API, pendiente de revisión por el admin"
    )
    is_selected = models.BooleanField(
        default=False,
        help_text="Elegida por el admin para asignarse a un día concreto"
    )
    is_used = models.BooleanField(
        default=False,
        help_text="Ya fue usada como test diario. No repetir en 1 año"
    )
    used_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Película'
        verbose_name_plural = 'Películas'
        ordering = ['-year', 'title']

    def __str__(self):
        return f"{self.title} ({self.year})"


class MovieBackdrop(models.Model):
    """
    Fotogramas (backdrops) descargados de TMDb para usar como pista IMAGE.
    Se almacenan hasta 10 URLs por película, ordenadas por relevancia.
    """
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='backdrops')
    url = models.URLField(max_length=500)
    vote_average = models.FloatField(default=0.0)
    vote_count = models.IntegerField(default=0)
    order = models.PositiveSmallIntegerField(default=0, help_text='0 = más relevante')

    class Meta:
        verbose_name = 'Fotograma'
        verbose_name_plural = 'Fotogramas'
        ordering = ['movie', 'order']

    def __str__(self):
        return f'Fotograma {self.order + 1} — {self.movie.title}'


class SelectedMovie(Movie):
    """Proxy: películas seleccionadas pendientes de asignarse a un test."""
    class Meta:
        proxy = True
        verbose_name = 'Película seleccionada'
        verbose_name_plural = 'Películas seleccionadas'


class UsedMovie(Movie):
    """Proxy: películas ya usadas en algún test diario."""
    class Meta:
        proxy = True
        verbose_name = 'Película usada'
        verbose_name_plural = 'Películas usadas'


class DailyTest(models.Model):
    """
    El test del día: relaciona una película con una fecha concreta.
    Cada día hay exactamente un test activo.
    """
    movie = models.ForeignKey(Movie, on_delete=models.PROTECT, related_name='daily_tests')
    date = models.DateField(unique=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_tests'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Test diario'
        verbose_name_plural = 'Tests diarios'
        ordering = ['-date']

    def __str__(self):
        return f"Test {self.date} — {self.movie.title}"


class Clue(models.Model):
    """
    Una de las 4 pistas de un DailyTest.
    Exactamente 4 pistas por test, orden 1→4 (de más difícil a más fácil).
    Cada pista es de un tipo diferente (no se repiten tipos en el mismo test).
    """
    daily_test = models.ForeignKey(DailyTest, on_delete=models.CASCADE, related_name='clues')
    clue_type = models.CharField(
        max_length=20,
        choices=ClueTypeCode.choices,
        help_text="Tipo de pista. No puede repetirse en el mismo test"
    )
    order = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        help_text="Posición de revelación: 1 (primera) a 4 (última)"
    )

    # Contenido de la pista (solo se rellena el campo correspondiente al tipo)
    content_text = models.TextField(
        blank=True,
        help_text="Para tipos: DIRECTOR, ACTOR, YEAR, ROTTEN_TOMATOES, OSCARS, OSCAR_CATEGORIES, ICONIC_QUOTE, GENRE, DURATION, COUNTRY, SCREENWRITER"
    )
    content_image = models.ImageField(
        upload_to='frames/',
        null=True, blank=True,
        help_text="Para tipo IMAGE: fotograma de la película"
    )

    class Meta:
        verbose_name = 'Pista'
        verbose_name_plural = 'Pistas'
        ordering = ['daily_test', 'order']
        unique_together = [
            ('daily_test', 'order'),         # No puede haber dos pistas en la misma posición
            ('daily_test', 'clue_type'),     # No puede haber dos pistas del mismo tipo
        ]

    def __str__(self):
        return f"Pista {self.order} ({self.get_clue_type_display()}) — {self.daily_test}"
