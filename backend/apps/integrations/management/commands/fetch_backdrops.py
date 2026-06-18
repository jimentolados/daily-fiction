"""
Management command: fetch_backdrops
Descarga hasta 10 fotogramas de TMDb para cada película ya importada en la BD.
"""
from django.core.management.base import BaseCommand

from apps.movies.models import Movie, MovieBackdrop
from apps.integrations.tmdb_client import TMDbClient, TMDbError


class Command(BaseCommand):
    help = 'Descarga fotogramas de TMDb para las películas ya importadas.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Sobreescribir fotogramas aunque ya existan.',
        )

    def handle(self, *args, **options):
        force = options['force']
        tmdb = TMDbClient()

        movies = Movie.objects.all().order_by('title')
        total = movies.count()

        if total == 0:
            self.stdout.write('No hay peliculas en la base de datos.')
            return

        self.stdout.write(f'Procesando {total} peliculas...\n')

        ok = 0
        skipped = 0
        errors = 0

        for movie in movies:
            already_has = MovieBackdrop.objects.filter(movie=movie).exists()

            if already_has and not force:
                self.stdout.write(f'  [SKIP] {movie.title} (ya tiene fotogramas)')
                skipped += 1
                continue

            if not movie.tmdb_id:
                self.stdout.write(f'  [SKIP] {movie.title} (sin TMDb ID)')
                skipped += 1
                continue

            try:
                backdrops = tmdb.get_backdrops(movie.tmdb_id, max_count=50)

                if not backdrops:
                    self.stdout.write(f'  [VACIO] {movie.title} — TMDb no tiene fotogramas')
                    skipped += 1
                    continue

                MovieBackdrop.objects.filter(movie=movie).delete()
                MovieBackdrop.objects.bulk_create([
                    MovieBackdrop(
                        movie=movie,
                        url=b['url'],
                        vote_average=b['vote_average'],
                        vote_count=b['vote_count'],
                        order=i,
                    )
                    for i, b in enumerate(backdrops)
                ])

                self.stdout.write(f'  [OK] {movie.title} — {len(backdrops)} fotogramas')
                ok += 1

            except TMDbError as e:
                self.stdout.write(f'  [ERROR] {movie.title}: {e}')
                errors += 1

        self.stdout.write(f'\nListo: {ok} actualizadas, {skipped} omitidas, {errors} errores.')
