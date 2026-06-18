import re
import requests
from django.conf import settings

BASE_URL = 'http://www.omdbapi.com/'


class OMDbClient:
    def __init__(self):
        self.api_key = settings.OMDB_API_KEY

    def _get(self, **params):
        try:
            params['apikey'] = self.api_key
            r = requests.get(BASE_URL, params=params, timeout=10)
            r.raise_for_status()
            data = r.json()
            if data.get('Response') == 'False':
                raise OMDbError(data.get('Error', 'Película no encontrada en OMDb'))
            return data
        except requests.RequestException as e:
            raise OMDbError(f'Error llamando a OMDb: {e}')

    # ─── Búsqueda por IMDb ID (obtenido desde TMDb) ───────────────────────────

    def get_by_imdb_id(self, imdb_id):
        """Devuelve datos de OMDb dado un IMDb ID (ej: 'tt1375666')."""
        return self._parse(self._get(i=imdb_id, plot='full'))

    def get_by_title_year(self, title, year=None):
        """Devuelve datos de OMDb dado un título y año opcionales."""
        params = {'t': title}
        if year:
            params['y'] = year
        return self._parse(self._get(**params))

    # ─── Parseo de la respuesta ───────────────────────────────────────────────

    def _parse(self, data):
        wins, nominations = self._parse_oscars(data.get('Awards', ''))
        return {
            'omdb_id': data.get('imdbID', ''),
            'oscar_wins': wins,
            'oscar_nominations': nominations,
            'rt_score': self._parse_rt(data.get('Ratings', [])),
            'genre': data.get('Genre', ''),
            'director': data.get('Director', ''),
            'lead_actor': data.get('Actors', '').split(',')[0].strip(),
            'screenwriter': data.get('Writer', '').split(',')[0].strip(),
            'duration_min': self._parse_runtime(data.get('Runtime', '')),
            'production_country': data.get('Country', '').split(',')[0].strip(),
        }

    @staticmethod
    def _parse_rt(ratings):
        """Extrae la puntuación de Rotten Tomatoes del array Ratings de OMDb."""
        for r in ratings:
            if r.get('Source') == 'Rotten Tomatoes':
                try:
                    return int(r['Value'].replace('%', ''))
                except (ValueError, KeyError):
                    pass
        return None

    @staticmethod
    def _parse_oscars(awards_text):
        """
        Extrae oscar_wins y oscar_nominations del campo Awards de OMDb.
        Ejemplos:
          "Won 4 Oscars. Another 143 wins & 224 nominations."
          "Nominated for 1 Oscar. Another 143 wins & 224 nominations."
          "Won 1 Oscar. Another 10 wins & 22 nominations."
        """
        if not awards_text or awards_text == 'N/A':
            return 0, 0

        wins = 0
        nominations = 0

        win_match = re.search(r'Won (\d+) Oscar', awards_text, re.IGNORECASE)
        if win_match:
            wins = int(win_match.group(1))

        nom_match = re.search(r'Nominated for (\d+) Oscar', awards_text, re.IGNORECASE)
        if nom_match:
            nominations = int(nom_match.group(1))
            if wins == 0:
                nominations = int(nom_match.group(1))

        # Si ganó, las nominaciones incluyen las victorias
        if wins > 0 and nominations == 0:
            nominations = wins

        return wins, nominations

    @staticmethod
    def _parse_runtime(runtime_str):
        """Convierte '148 min' → 148."""
        match = re.search(r'(\d+)', runtime_str or '')
        return int(match.group(1)) if match else None


class OMDbError(Exception):
    pass
