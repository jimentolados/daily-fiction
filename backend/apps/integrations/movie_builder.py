import logging

from apps.movies.models import Movie, MovieBackdrop
from .tmdb_client import TMDbClient, TMDbError
from .omdb_client import OMDbClient, OMDbError
from .spotify_client import SpotifyClient, SpotifyError
from .wikidata_client import WikidataClient

logger = logging.getLogger(__name__)


class MovieBuilder:
    """
    Orquestador de las APIs externas.
    Construye o actualiza un objeto Movie a partir de TMDb + OMDb + Spotify.

    Flujo:
    1. TMDb  → título ES, título original, año, director, actor, guionista,
                póster, sinopsis, duración, género, país
    2. OMDb  → oscar_wins, oscar_nominations (y datos de respaldo si TMDb falla)
    3. Spotify → spotify_track_id para el fragmento de banda sonora

    El campo `rt_score` se importa automáticamente desde OMDb.
    """

    def __init__(self, fetch_spotify=True):
        self.tmdb = TMDbClient()
        self.omdb = OMDbClient()
        self.spotify = SpotifyClient() if fetch_spotify else None
        self.wikidata = WikidataClient()

    def build_from_tmdb_id(self, tmdb_id, fetch_spotify=True):
        """
        Crea o actualiza una película a partir de su ID de TMDb.
        Devuelve el objeto Movie (sin guardar en BD, usa update_or_create internamente).
        """
        # ── 1. TMDb ──────────────────────────────────────────────────────────
        try:
            tmdb_data = self.tmdb.get_movie_details(tmdb_id)
        except TMDbError as e:
            logger.error(f'TMDb error para ID {tmdb_id}: {e}')
            raise

        # ── 2. OMDb (usando el título+año de TMDb para buscar) ────────────────
        omdb_data = {}
        try:
            omdb_data = self.omdb.get_by_title_year(
                title=tmdb_data['original_title'],
                year=tmdb_data.get('year'),
            )
        except OMDbError as e:
            logger.warning(f'OMDb no encontró datos para "{tmdb_data["title"]}": {e}')

        # Descartar películas que Rotten Tomatoes no cubre
        if omdb_data.get('rt_score') is None:
            logger.info(f'Descartada "{tmdb_data["title"]}": sin puntuación en Rotten Tomatoes.')
            return None, False

        # ── 3. Spotify ────────────────────────────────────────────────────────
        spotify_track_id = ''
        if fetch_spotify and self.spotify:
            try:
                spotify_track_id = self.spotify.find_soundtrack_preview(
                    movie_title=tmdb_data['original_title'],
                    year=tmdb_data.get('year'),
                ) or ''
            except SpotifyError as e:
                logger.warning(f'Spotify no encontró banda sonora para "{tmdb_data["title"]}": {e}')

        # ── 4. Combinar y guardar ─────────────────────────────────────────────
        movie_data = {
            'title':              tmdb_data['title'],
            'original_title':     tmdb_data['original_title'],
            'year':               tmdb_data.get('year'),
            'director':           tmdb_data.get('director') or omdb_data.get('director', ''),
            'lead_actor':         tmdb_data.get('lead_actor') or omdb_data.get('lead_actor', ''),
            'screenwriter':       tmdb_data.get('screenwriter') or omdb_data.get('screenwriter', ''),
            'synopsis':           tmdb_data.get('synopsis', ''),
            'poster_url':         tmdb_data.get('poster_url', ''),
            'duration_min':       tmdb_data.get('duration_min') or omdb_data.get('duration_min'),
            'genre':              tmdb_data.get('genre') or omdb_data.get('genre', ''),
            'production_country': tmdb_data.get('production_country') or omdb_data.get('production_country', ''),
            'omdb_id':            omdb_data.get('omdb_id', ''),
            'oscar_wins':         omdb_data.get('oscar_wins', 0),
            'oscar_nominations':  omdb_data.get('oscar_nominations', 0),
            'rt_score':           omdb_data.get('rt_score'),
            'oscar_categories':   self.wikidata.get_oscar_categories(omdb_data.get('omdb_id', '')),

            'spotify_track_id':   spotify_track_id,
            'is_candidate':       True,
        }

        movie, created = Movie.objects.update_or_create(
            tmdb_id=tmdb_id,
            defaults=movie_data,
        )

        # ── 5. Backdrops (fotogramas para pista IMAGE) ────────────────────────
        try:
            backdrops = self.tmdb.get_backdrops(tmdb_id, max_count=50)
            if backdrops:
                # Reemplazar los backdrops anteriores si ya existía la película
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
                logger.info(f'  {len(backdrops)} fotogramas guardados para {movie.title}')
        except Exception as e:
            logger.warning(f'No se pudieron obtener fotogramas para TMDb ID {tmdb_id}: {e}')

        action = 'Creada' if created else 'Actualizada'
        logger.info(f'{action} película: {movie.title} ({movie.year}) [TMDb ID: {tmdb_id}]')
        return movie, created

    def build_batch(self, tmdb_ids, fetch_spotify=True):
        """
        Procesa una lista de TMDb IDs y devuelve (creadas, actualizadas, errores).
        """
        created_count = 0
        updated_count = 0
        errors = []

        for tmdb_id in tmdb_ids:
            # Saltar si ya existe y ya fue usada recientemente
            if Movie.objects.filter(tmdb_id=tmdb_id, is_used=True).exists():
                logger.info(f'Omitiendo TMDb ID {tmdb_id}: ya fue usada recientemente.')
                continue
            try:
                movie, created = self.build_from_tmdb_id(tmdb_id, fetch_spotify=fetch_spotify)
                if movie is None:
                    continue  # Descartada por filtro (sin RT u otro criterio)
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except Exception as e:
                logger.error(f'Error procesando TMDb ID {tmdb_id}: {e}')
                errors.append({'tmdb_id': tmdb_id, 'error': str(e)})

        return created_count, updated_count, errors
