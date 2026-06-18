from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError

from apps.movies.models import Movie, DailyTest, Clue
from apps.movies.choices import ClueTypeCode


# Pistas fijas en orden de revelación (1 = más difícil, 4 = más fácil)
CLUE_SEQUENCE = [
    ClueTypeCode.ROTTEN_TOMATOES,
    ClueTypeCode.DIRECTOR,
    ClueTypeCode.YEAR,
    ClueTypeCode.ACTOR,
]

# Cuántas películas extra descargar de TMDb si el pool es insuficiente
FETCH_MULTIPLIER = 3


def _clue_content(movie: Movie, clue_type: str) -> str:
    if clue_type == ClueTypeCode.ROTTEN_TOMATOES:
        return f'{movie.rt_score}%' if movie.rt_score is not None else ''
    if clue_type == ClueTypeCode.DIRECTOR:
        return movie.director
    if clue_type == ClueTypeCode.YEAR:
        return str(movie.year) if movie.year else ''
    if clue_type == ClueTypeCode.ACTOR:
        return movie.lead_actor
    return ''


def _is_eligible(movie: Movie) -> bool:
    """True si la película tiene todos los campos necesarios para las 4 pistas."""
    return all(_clue_content(movie, ct) for ct in CLUE_SEQUENCE)


def _fetch_movies(needed: int, existing_ids: set, stdout, style) -> int:
    """
    Descarga películas de TMDb+OMDb hasta tener `needed` nuevas elegibles.
    Devuelve el número de películas creadas en BD.
    """
    from apps.integrations.tmdb_client import TMDbClient
    from apps.integrations.movie_builder import MovieBuilder

    stdout.write(style.NOTICE(
        f'  Pool insuficiente — descargando candidatas de TMDb...'
    ))

    tmdb = TMDbClient()
    builder = MovieBuilder()

    candidate_ids = tmdb.discover_movies_mixed(
        count=needed * FETCH_MULTIPLIER,
        existing_ids=existing_ids,
    )

    created = 0
    for tmdb_id in candidate_ids:
        if created >= needed:
            break
        try:
            movie, was_created = builder.build_from_tmdb_id(tmdb_id)
            if movie and was_created and _is_eligible(movie):
                created += 1
        except Exception:
            pass

    stdout.write(f'  {created} película(s) nueva(s) importada(s) de TMDb.')
    return created


class Command(BaseCommand):
    help = (
        'Programa tests diarios de forma completamente automática. '
        'Elige las mejores películas disponibles (por RT + Oscars), '
        'descarga más de TMDb si el pool es insuficiente, y '
        'crea DailyTest + 4 pistas sin intervención del admin. '
        'Pistas: ROTTEN_TOMATOES → DIRECTOR → YEAR → ACTOR.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--start',
            type=str,
            default=None,
            help='Fecha de inicio YYYY-MM-DD (por defecto: mañana)',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Número de días a programar (por defecto: 7)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se crearía sin guardar nada en la base de datos',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if options['start']:
            try:
                start_date = date.fromisoformat(options['start'])
            except ValueError:
                raise CommandError('Formato de fecha inválido. Usa YYYY-MM-DD.')
        else:
            start_date = date.today() + timedelta(days=1)

        days = options['days']
        dates_to_schedule = [start_date + timedelta(days=i) for i in range(days)]

        # Días que ya tienen test asignado → saltar
        already_scheduled = set(
            DailyTest.objects.filter(date__in=dates_to_schedule)
            .values_list('date', flat=True)
        )
        pending_dates = [d for d in dates_to_schedule if d not in already_scheduled]

        if not pending_dates:
            self.stdout.write(self.style.WARNING(
                'Todos los días del rango ya tienen test asignado.'
            ))
            return

        needed = len(pending_dates)
        mode = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(self.style.NOTICE(
            f'\n{mode}Programando {needed} test(s) desde {pending_dates[0]}...\n'
        ))

        if already_scheduled:
            self.stdout.write(self.style.WARNING(
                f'  Saltando {len(already_scheduled)} fecha(s) ya programada(s).\n'
            ))

        # Pool: todas las películas no usadas con los 4 campos completos
        pool = list(
            Movie.objects.filter(is_used=False)
            .filter(
                rt_score__isnull=False,
                director__gt='',
                year__isnull=False,
                lead_actor__gt='',
            )
            .order_by('-rt_score', '-oscar_wins', '-year')
        )

        # Auto-fetch si el pool es insuficiente
        if len(pool) < needed and not dry_run:
            existing_ids = set(Movie.objects.values_list('tmdb_id', flat=True))
            _fetch_movies(needed - len(pool), existing_ids, self.stdout, self.style)
            # Recargar el pool tras la descarga
            pool = list(
                Movie.objects.filter(is_used=False)
                .filter(
                    rt_score__isnull=False,
                    director__gt='',
                    year__isnull=False,
                    lead_actor__gt='',
                )
                .order_by('-rt_score', '-oscar_wins', '-year')
            )

        if len(pool) < needed:
            raise CommandError(
                f'Pool insuficiente tras el auto-fetch: '
                f'se necesitan {needed}, hay {len(pool)}.'
            )

        chosen = pool[:needed]

        for test_date, movie in zip(pending_dates, chosen):
            if dry_run:
                self.stdout.write(
                    f'  {test_date}  →  {movie.title} ({movie.year})  '
                    f'[RT: {movie.rt_score}%  Oscars: {movie.oscar_wins}]'
                )
                for order, ct in enumerate(CLUE_SEQUENCE, start=1):
                    self.stdout.write(
                        f'    Pista {order}  {ct:<20}  {_clue_content(movie, ct)}'
                    )
                continue

            daily_test = DailyTest.objects.create(
                movie=movie,
                date=test_date,
                is_active=True,
            )
            for order, clue_type in enumerate(CLUE_SEQUENCE, start=1):
                Clue.objects.create(
                    daily_test=daily_test,
                    clue_type=clue_type,
                    order=order,
                    content_text=_clue_content(movie, clue_type),
                )

            movie.is_used = True
            movie.is_selected = False
            movie.is_candidate = False
            movie.used_date = test_date
            movie.save(update_fields=['is_used', 'is_selected', 'is_candidate', 'used_date'])

            self.stdout.write(self.style.SUCCESS(
                f'  {test_date}  ✓  {movie.title} ({movie.year})  '
                f'[RT: {movie.rt_score}%  Oscars: {movie.oscar_wins}]'
            ))

        if not dry_run:
            self.stdout.write(self.style.SUCCESS('\nProgramación completada.'))
