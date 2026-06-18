import requests
from django.conf import settings

BASE_URL = 'https://api.themoviedb.org/3'
IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

# Géneros de cine más relevantes para el quiz (excluyendo documentales, animación infantil, etc.)
GENRE_WHITELIST = {
    28, 12, 35, 80, 18, 10751, 14, 36, 27, 10402,
    9648, 10749, 878, 53, 10752, 37,
}


class TMDbClient:
    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        self.session = requests.Session()
        self.session.params = {'api_key': self.api_key, 'language': 'es-ES'}

    def _get(self, endpoint, **params):
        """Llamada GET genérica con gestión de errores."""
        try:
            r = self.session.get(f'{BASE_URL}{endpoint}', params=params, timeout=10)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            raise TMDbError(f'Error llamando a TMDb: {e}')

    # ─── Búsqueda y detalle ───────────────────────────────────────────────────

    def get_movie_details(self, tmdb_id):
        """
        Devuelve los detalles completos de una película por su ID de TMDb.
        Incluye los créditos (director y actor principal).
        """
        data = self._get(f'/movie/{tmdb_id}', append_to_response='credits')

        director = ''
        lead_actor = ''
        screenwriter = ''

        crew = data.get('credits', {}).get('crew', [])
        cast = data.get('credits', {}).get('cast', [])

        for member in crew:
            if member.get('job') == 'Director':
                director = member.get('name', '')
                break

        for member in crew:
            if member.get('job') in ('Screenplay', 'Writer', 'Story'):
                screenwriter = member.get('name', '')
                break

        if cast:
            lead_actor = cast[0].get('name', '')

        poster_path = data.get('poster_path', '')
        poster_url = f"{IMAGE_BASE}{poster_path}" if poster_path else ''

        # Título en español (si TMDb lo tiene) o el original
        title_es = data.get('title', '')
        original_title = data.get('original_title', '')

        genres = [g['name'] for g in data.get('genres', [])]
        countries = [c['name'] for c in data.get('production_countries', [])]

        release_date = data.get('release_date', '')
        year = int(release_date[:4]) if release_date and len(release_date) >= 4 else None

        return {
            'tmdb_id': tmdb_id,
            'title': title_es or original_title,
            'original_title': original_title,
            'year': year,
            'director': director,
            'lead_actor': lead_actor,
            'screenwriter': screenwriter,
            'synopsis': data.get('overview', ''),
            'poster_url': poster_url,
            'duration_min': data.get('runtime'),
            'genre': ', '.join(genres),
            'production_country': countries[0] if countries else '',
        }

    def discover_movies(self, page=1, min_vote_avg=7.0, min_votes=2000,
                        year_from=1970, year_to=None, sort_by='popularity.desc'):
        """
        Descubre películas según criterios de calidad.
        Devuelve una lista de IDs de TMDb.
        """
        from datetime import date
        year_to = year_to or date.today().year

        params = {
            'sort_by': sort_by,
            'vote_average.gte': min_vote_avg,
            'vote_count.gte': min_votes,
            'primary_release_date.gte': f'{year_from}-01-01',
            'primary_release_date.lte': f'{year_to}-12-31',
            'with_original_language': 'en|es|fr|it|de|ja|ko',
            'page': page,
        }
        data = self._get('/discover/movie', **params)
        return [m['id'] for m in data.get('results', [])]

    def discover_movies_mixed(self, count=62, existing_ids=None):
        """
        Descubre películas con enfoque cinéfilo:
        - Clásicos de autor (Wilder, Kubrick, Coppola, Scorsese...)
        - Cine internacional premiado (Cannes, Oscar, Berlín)
        - Joyas de culto conocidas por cinéfilos
        - Una minoría de populares reconocibles

        Estrategias:
        - 35% clásicos 1950-1990, nota >= 7.8, ordenados por nota
        - 25% cine de culto 1990-2010, nota >= 7.5, páginas aleatorias
        - 25% cine internacional (no en inglés), nota >= 7.5
        - 15% conocidas modernas 2000-hoy, popularidad alta
        + Lista curada de IDs garantizados
        """
        import random
        existing_ids = existing_ids or set()
        collected = []

        # ── Lista curada: clásicos que deben estar siempre disponibles ──────────
        CURATED_IDS = [
            # Billy Wilder
            289,    # El Apartamento (The Apartment)
            713,    # Con faldas y a lo loco (Some Like It Hot)
            # Milos Forman
            1366,   # Alguien voló sobre el nido del cuco
            # Mike Nichols
            1213,   # El Graduado (The Graduate)
            # Kubrick
            935,    # 2001: A Space Odyssey
            15190,  # El Resplandor
            424,    # Schindler's List (Spielberg)
            # Coppola
            238,    # El Padrino
            240,    # El Padrino II
            769,    # Apocalypse Now
            # Scorsese
            769,    # Taxi Driver
            278,    # Cadena Perpetua
            598,    # Ciudad de Dios
            # Bong Joon-ho
            496243, # Parásitos
            # Denis Villeneuve
            329865, # Arrival
            # David Fincher
            807,    # Seven (Se7en)
            550,    # El Club de la Lucha
            # Coens
            115,    # El Gran Lebowski
            510,    # No Country for Old Men
            # Clásicos europeos
            761,    # Cinema Paradiso
            637,    # La Vita è Bella
            103,    # Amelie
            194,    # El Silencio de los Corderos
            # Japonés / asiático
            129,    # El Viaje de Chihiro
            372754, # Burning (Lee Chang-dong)
            # Tarrantino
            680,    # Pulp Fiction
            24,     # Kill Bill
            # P.T. Anderson
            4982,   # There Will Be Blood
            # Wong Kar-wai
            11104,  # In the Mood for Love
            # Fellini / Bergman
            421,    # La Dolce Vita
            1058,   # El Séptimo Sello
            # Hitchcock
            539,    # Psycho
            694,    # Rear Window
        ]

        curated_new = [mid for mid in CURATED_IDS if mid not in existing_ids]
        random.shuffle(curated_new)
        collected.extend(curated_new)

        # ── Estrategias de descubrimiento ────────────────────────────────────────
        strategies = [
            # (ratio, sort_by, min_votes, min_rating, year_from, year_to, lang)
            (0.35, 'vote_average.desc', 1000, 7.8, 1950, 1995, None),   # clásicos de autor
            (0.25, 'vote_average.desc', 1500, 7.5, 1990, 2012, None),   # cine de culto
            (0.25, 'vote_average.desc',  800, 7.5, 1960, 2020, 'fr|it|de|ja|ko|es'),  # internacional
            (0.15, 'popularity.desc',   3000, 7.0, 2000, 2024, None),   # modernas conocidas
        ]

        for ratio, sort_by, min_votes, min_rating, year_from, year_to, lang in strategies:
            target = int(count * ratio * 2)
            ids = []
            pages = list(range(1, 15))
            random.shuffle(pages)

            for page in pages:
                if len(ids) >= target:
                    break
                try:
                    extra = {}
                    if lang:
                        extra['with_original_language'] = lang
                    batch = self._get('/discover/movie', **{
                        'sort_by': sort_by,
                        'vote_average.gte': min_rating,
                        'vote_count.gte': min_votes,
                        'primary_release_date.gte': f'{year_from}-01-01',
                        'primary_release_date.lte': f'{year_to}-12-31',
                        'page': page,
                        **extra,
                    })
                    for m in batch.get('results', []):
                        mid = m['id']
                        if mid not in existing_ids and mid not in ids:
                            ids.append(mid)
                except TMDbError:
                    continue

            random.shuffle(ids)
            collected.extend(ids[:int(count * ratio * 1.5)])

        # Deduplicar y mezclar (la curada va primero para garantizar que entren)
        seen = set()
        result = []
        for mid in collected:
            if mid not in seen and mid not in existing_ids:
                seen.add(mid)
                result.append(mid)

        # Mezclar respetando que los curados estén en los primeros puestos
        curated_result = [m for m in result if m in set(curated_new)]
        rest = [m for m in result if m not in set(curated_new)]
        random.shuffle(rest)

        return (curated_result + rest)[:count * 2]

    def get_backdrops(self, tmdb_id, max_count=50):
        """
        Devuelve hasta max_count URLs de backdrops para una película,
        priorizando imágenes sin texto (iso_639_1=null) y con mayor puntuación.
        """
        # include_image_language=null,en obtiene backdrops sin texto + inglés
        # Se pasa language='' para evitar que el filtro de idioma de la sesión limite los resultados
        data = self._get(f'/movie/{tmdb_id}/images', language='', include_image_language='en,null')
        backdrops = data.get('backdrops', [])

        def sort_key(b):
            return (b.get('vote_count', 0) > 0, b.get('vote_average', 0))

        # Intento 1: sin texto + HD
        clean = [b for b in backdrops if b.get('iso_639_1') is None and b.get('width', 0) >= 1280]
        # Intento 2: completar con cualquier backdrop HD
        if len(clean) < max_count:
            rest = [b for b in backdrops if b not in clean and b.get('width', 0) >= 1280]
            clean += rest
        # Intento 3: si sigue sin haber nada, usar todos los backdrops disponibles
        if not clean:
            clean = list(backdrops)

        clean.sort(key=sort_key, reverse=True)

        result = []
        for b in clean[:max_count]:
            path = b.get('file_path', '')
            if path:
                result.append({
                    'url': f'{IMAGE_BASE}{path}',
                    'vote_average': b.get('vote_average', 0.0),
                    'vote_count': b.get('vote_count', 0),
                })
        return result

    def search_movie(self, query, year=None):
        """Búsqueda de película por nombre. Devuelve el primer resultado relevante."""
        params = {'query': query}
        if year:
            params['year'] = year
        data = self._get('/search/movie', **params)
        results = data.get('results', [])
        return results[0]['id'] if results else None


class TMDbError(Exception):
    pass
