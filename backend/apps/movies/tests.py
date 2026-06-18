from django.test import TestCase
from rest_framework.test import APIClient

from apps.movies.models import Movie


class MovieSearchViewTests(TestCase):
    URL = '/api/v1/movies/search/'

    def setUp(self):
        Movie.objects.create(title='Blade Runner',      original_title='Blade Runner',      year=1982)
        Movie.objects.create(title='Blade Runner 2049', original_title='Blade Runner 2049', year=2017)
        Movie.objects.create(title='Inception',         original_title='Inception',         year=2010)
        self.client = APIClient()

    def test_busqueda_devuelve_coincidencias(self):
        response = self.client.get(self.URL, {'q': 'Blade'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_query_de_un_caracter_devuelve_lista_vacia(self):
        response = self.client.get(self.URL, {'q': 'B'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_sin_parametro_devuelve_lista_vacia(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_busqueda_por_titulo_original(self):
        response = self.client.get(self.URL, {'q': 'Inception'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Inception')

    def test_busqueda_insensible_a_mayusculas(self):
        response = self.client.get(self.URL, {'q': 'blade runner'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_resultado_incluye_campos_necesarios(self):
        response = self.client.get(self.URL, {'q': 'Inception'})
        fields = {'id', 'title', 'original_title', 'year', 'poster_url'}
        self.assertTrue(fields.issubset(set(response.data[0].keys())))
