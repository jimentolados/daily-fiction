"""
Management command: fetch_oscar_data
Actualiza wins, nominations y categorías de Oscar para todas las películas.
Fuentes: OMDb (wins/nominations) + Wikidata (categorías ganadas y nominadas).
"""
import time
from django.core.management.base import BaseCommand
from apps.movies.models import Movie
from apps.integrations.omdb_client import OMDbClient, OMDbError
from apps.integrations.wikidata_client import WikidataClient


class Command(BaseCommand):
    help = 'Actualiza datos de Oscar (wins, nominations, categorías) para todas las películas.'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true',
                            help='Reprocesar aunque ya tengan datos.')
        parser.add_argument('--only-categories', action='store_true',
                            help='Solo actualizar categorías de Wikidata, no los contadores de OMDb.')

    def handle(self, *args, **options):
        force = options['force']
        only_cats = options['only_categories']
        omdb = OMDbClient()
        wikidata = WikidataClient()

        movies = Movie.objects.all().order_by('title')
        self.stdout.write(f'Procesando {movies.count()} peliculas...\n')

        ok = skipped = errors = 0

        for m in movies:
            changed = False

            # ── OMDb: wins + nominations ──────────────────────────────────────
            if not only_cats and (force or not m.omdb_id or (m.oscar_wins == 0 and m.oscar_nominations == 0)):
                try:
                    # Intentar primero con título original, luego sin año
                    raw = None
                    for kwargs in [
                        {'t': m.original_title or m.title, 'y': m.year},
                        {'t': m.original_title or m.title},
                        {'t': m.title},
                    ]:
                        try:
                            raw = omdb._get(**kwargs)
                            if raw.get('Response') == 'True':
                                break
                            raw = None
                        except OMDbError:
                            continue

                    if raw:
                        wins, noms = omdb._parse_oscars(raw.get('Awards', ''))
                        imdb_id = raw.get('imdbID', '')
                        if imdb_id and not m.omdb_id:
                            m.omdb_id = imdb_id
                            changed = True
                        if wins != m.oscar_wins or noms != m.oscar_nominations:
                            m.oscar_wins = wins
                            m.oscar_nominations = noms
                            changed = True
                except Exception as e:
                    self.stdout.write(f'  [ERR OMDb] {m.title}: {e}')
                    errors += 1

            # ── Wikidata: categorías ──────────────────────────────────────────
            if m.omdb_id:
                try:
                    cats = wikidata.get_oscar_categories(m.omdb_id)
                    if cats != m.oscar_categories:
                        m.oscar_categories = cats
                        changed = True
                    time.sleep(1)  # respetar rate limit de Wikidata
                except Exception as e:
                    self.stdout.write(f'  [ERR Wikidata] {m.title}: {e}')

            if changed:
                m.save(update_fields=['omdb_id', 'oscar_wins', 'oscar_nominations', 'oscar_categories'])
                cats = m.oscar_categories or {}
                won_str  = ', '.join(cats.get('won', [])) or '—'
                nom_str  = ', '.join(cats.get('nominated', [])) or '—'
                self.stdout.write(
                    f'  [OK] {m.title} | wins={m.oscar_wins} noms={m.oscar_nominations}\n'
                    f'       Gano: {won_str}\n'
                    f'       Nominada: {nom_str}'
                )
                ok += 1
            else:
                skipped += 1

        self.stdout.write(f'\nListo: {ok} actualizadas, {skipped} sin cambios, {errors} errores.')
