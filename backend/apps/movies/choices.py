from django.db import models


class ClueTypeCode(models.TextChoices):
    """
    Tipos de pista disponibles para los tests diarios.
    Cada test usa exactamente 4 pistas, una de cada tipo elegido por el admin.
    """
    IMAGE = 'IMAGE', 'Fotograma de la película'
    DIRECTOR = 'DIRECTOR', 'Director'
    ACTOR = 'ACTOR', 'Actor/Actriz protagonista'
    YEAR = 'YEAR', 'Año de estreno'
    ROTTEN_TOMATOES = 'ROTTEN_TOMATOES', 'Valoración en Rotten Tomatoes'
    OSCARS = 'OSCARS', 'Número de Oscars'
    OSCAR_CATEGORIES = 'OSCAR_CATEGORIES', 'Categorías de Oscar ganadas'
    ICONIC_QUOTE = 'ICONIC_QUOTE', 'Frase icónica'
    GENRE = 'GENRE', 'Género'
    DURATION = 'DURATION', 'Duración'
    COUNTRY = 'COUNTRY', 'País de producción'
    SCREENWRITER = 'SCREENWRITER', 'Guionista'
