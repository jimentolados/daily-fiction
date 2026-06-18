from django.core.management.base import BaseCommand

from apps.movies.models import Movie
from apps.integrations.tmdb_client import TMDbClient, TMDbError
from apps.integrations.movie_builder import MovieBuilder


# Número de películas candidatas a descargar (el doble de los días del mes siguiente)
TARGET_CANDIDATES = 62


class Command(BaseCommand):
    help = (
        'Descarga películas candidatas desde TMDb para el mes siguiente. '
        'Se ejecuta automáticamente el día 15 de cada mes. '
        'Descarga ~62 películas para que el admin elija las 31 del mes.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=TARGET_CANDIDATES,
            help=f'Número de candidatas a descargar (por defecto: {TARGET_CANDIDATES})',
        )
        parser.add_argument(
            '--no-spotify',
            action='store_true',
            help='Omitir búsqueda de Spotify (útil si no se tiene la API configurada)',
        )
        parser.add_argument(
            '--year-from',
            type=int,
            default=1970,
            help='Año mínimo de las películas (por defecto: 1970)',
        )
        parser.add_argument(
            '--min-votes',
            type=int,
            default=2000,
            help='Mínimo de votos en TMDb (por defecto: 2000)',
        )
        parser.add_argument(
            '--min-rating',
            type=float,
            default=7.0,
            help='Puntuación mínima en TMDb (por defecto: 7.0)',
        )

    def handle(self, *args, **options):
        count = options['count']
        fetch_spotify = not options['no_spotify']
        year_from = options['year_from']
        min_votes = options['min_votes']
        min_rating = options['min_rating']

        self.stdout.write(self.style.NOTICE(
            f'\nIniciando descarga de {count} películas candidatas...'
        ))

        # Obtener los tmdb_ids ya existentes en la BD para no duplicar
        existing_ids = set(Movie.objects.values_list('tmdb_id', flat=True))
        # IDs usados en el último año: no repetir
        used_ids = set(Movie.objects.filter(is_used=True).values_list('tmdb_id', flat=True))

        tmdb = TMDbClient()
        builder = MovieBuilder(fetch_spotify=fetch_spotify)

        collected_ids = []
        page = 1

        # Recolectar IDs con estrategia mixta (populares + cine de culto + joyas)
        skip_ids = existing_ids | used_ids
        collected_ids = tmdb.discover_movies_mixed(count=count * 2, existing_ids=skip_ids)

        # Limitar al número solicitado
        ids_to_fetch = collected_ids[:count]

        self.stdout.write(f'  {len(ids_to_fetch)} IDs nuevos encontrados en TMDb.')
        self.stdout.write(f'  Spotify: {"activado" if fetch_spotify else "desactivado"}\n')

        # Descargar y construir las películas
        created, updated, errors = builder.build_batch(ids_to_fetch, fetch_spotify=fetch_spotify)

        self.stdout.write(self.style.SUCCESS(
            f'\nDescarga completada:'
            f'\n  Creadas:      {created}'
            f'\n  Actualizadas: {updated}'
            f'\n  Errores:      {len(errors)}'
        ))

        if errors:
            self.stdout.write(self.style.WARNING('\nErrores encontrados:'))
            for e in errors:
                self.stdout.write(f"  TMDb ID {e['tmdb_id']}: {e['error']}")

        self.stdout.write(
            f'\nAccede al admin para revisar y seleccionar las películas del mes próximo.'
        )
