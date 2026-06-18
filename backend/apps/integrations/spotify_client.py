import base64
import requests
from django.conf import settings

TOKEN_URL = 'https://accounts.spotify.com/api/token'
SEARCH_URL = 'https://api.spotify.com/v1/search'


class SpotifyClient:
    """
    Cliente para la API de Spotify.
    Usa el flujo Client Credentials (sin usuario) para buscar
    fragmentos de 30 segundos de bandas sonoras de películas.
    """

    def __init__(self):
        self.client_id = settings.SPOTIFY_CLIENT_ID
        self.client_secret = settings.SPOTIFY_CLIENT_SECRET
        self._access_token = None

    # ─── Autenticación ────────────────────────────────────────────────────────

    def _get_access_token(self):
        """Obtiene un access token via Client Credentials. Se cachea en memoria."""
        if self._access_token:
            return self._access_token

        credentials = base64.b64encode(
            f'{self.client_id}:{self.client_secret}'.encode()
        ).decode()

        try:
            r = requests.post(
                TOKEN_URL,
                headers={'Authorization': f'Basic {credentials}'},
                data={'grant_type': 'client_credentials'},
                timeout=10,
            )
            r.raise_for_status()
            self._access_token = r.json()['access_token']
            return self._access_token
        except requests.RequestException as e:
            raise SpotifyError(f'Error obteniendo token de Spotify: {e}')

    def _auth_headers(self):
        return {'Authorization': f'Bearer {self._get_access_token()}'}

    # ─── Búsqueda de banda sonora ─────────────────────────────────────────────

    def find_soundtrack_preview(self, movie_title, year=None):
        """
        Busca la banda sonora de una película en Spotify.
        Devuelve el track_id del primer resultado con preview_url disponible.
        La preview_url de Spotify tiene exactamente 30 segundos.

        Estrategia de búsqueda:
        1. Busca "{título} Original Motion Picture Soundtrack"
        2. Si no hay preview, busca "{título} score"
        3. Si no hay preview, busca "{título} theme"
        """
        queries = [
            f'{movie_title} Original Motion Picture Soundtrack',
            f'{movie_title} Original Score',
            f'{movie_title} Main Theme',
        ]

        for query in queries:
            track_id = self._search_track(query)
            if track_id:
                return track_id

        return None

    def _search_track(self, query):
        """Busca un track en Spotify y devuelve el ID si tiene preview disponible."""
        try:
            r = requests.get(
                SEARCH_URL,
                headers=self._auth_headers(),
                params={'q': query, 'type': 'track', 'limit': 5, 'market': 'ES'},
                timeout=10,
            )
            r.raise_for_status()
            tracks = r.json().get('tracks', {}).get('items', [])

            for track in tracks:
                if track.get('preview_url'):
                    return track['id']

        except requests.RequestException as e:
            raise SpotifyError(f'Error buscando en Spotify: {e}')

        return None

    def get_preview_url(self, track_id):
        """Dado un track_id, devuelve su preview_url (30s) desde la API de Spotify."""
        try:
            r = requests.get(
                f'https://api.spotify.com/v1/tracks/{track_id}',
                headers=self._auth_headers(),
                timeout=10,
            )
            r.raise_for_status()
            return r.json().get('preview_url')
        except requests.RequestException as e:
            raise SpotifyError(f'Error obteniendo preview de Spotify: {e}')


class SpotifyError(Exception):
    pass
