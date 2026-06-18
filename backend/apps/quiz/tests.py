import datetime

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.movies.models import Movie, DailyTest, Clue
from apps.quiz.models import GameSession
from apps.quiz.scoring import normalize_title, is_correct_guess, calculate_score


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_daily_test(date=None):
    """Película + DailyTest de hoy con 4 pistas mínimas."""
    movie = Movie.objects.create(
        title='El Padrino',
        original_title='The Godfather',
        year=1972,
    )
    daily_test = DailyTest.objects.create(
        date=date or datetime.date.today(),
        movie=movie,
    )
    for order, clue_type, text in [
        (1, 'DIRECTOR', 'Francis Ford Coppola'),
        (2, 'YEAR',     '1972'),
        (3, 'GENRE',    'Drama'),
        (4, 'ACTOR',    'Marlon Brando'),
    ]:
        Clue.objects.create(
            daily_test=daily_test, order=order,
            clue_type=clue_type, content_text=text,
        )
    return movie, daily_test


# ─── normalize_title ──────────────────────────────────────────────────────────

class NormalizeTitleTests(TestCase):
    def test_elimina_acentos(self):
        self.assertEqual(normalize_title('Amélie'), 'amelie')

    def test_convierte_a_minusculas(self):
        self.assertEqual(normalize_title('BLADE RUNNER'), 'blade runner')

    def test_elimina_puntuacion(self):
        self.assertEqual(normalize_title('No Country, For Old Men.'), 'no country for old men')

    def test_colapsa_espacios(self):
        self.assertEqual(normalize_title('El   Padrino'), 'el padrino')

    def test_cadena_vacia(self):
        self.assertEqual(normalize_title(''), '')


# ─── is_correct_guess ────────────────────────────────────────────────────────

class IsCorrectGuessTests(TestCase):
    def setUp(self):
        self.movie = Movie.objects.create(
            title='El Padrino',
            original_title='The Godfather',
            year=1972,
            franchise_name='El Padrino',
        )

    def test_coincide_titulo_castellano(self):
        self.assertTrue(is_correct_guess('El Padrino', self.movie))

    def test_coincide_titulo_original(self):
        self.assertTrue(is_correct_guess('The Godfather', self.movie))

    def test_insensible_a_mayusculas(self):
        self.assertTrue(is_correct_guess('el padrino', self.movie))

    def test_insensible_a_acentos(self):
        self.assertTrue(is_correct_guess('El Padrino', self.movie))

    def test_titulo_incorrecto(self):
        self.assertFalse(is_correct_guess('Apocalypse Now', self.movie))

    def test_intento_vacio(self):
        self.assertFalse(is_correct_guess('', self.movie))


# ─── calculate_score ─────────────────────────────────────────────────────────

class CalculateScoreTests(TestCase):
    def test_pista_1_da_maximo(self):
        self.assertEqual(calculate_score(1), 100)

    def test_pista_2(self):
        self.assertEqual(calculate_score(2), 70)

    def test_pista_3(self):
        self.assertEqual(calculate_score(3), 40)

    def test_pista_4(self):
        self.assertEqual(calculate_score(4), 10)

    def test_intento_final_da_cero(self):
        self.assertEqual(calculate_score(5), 0)


# ─── TodayTestView ───────────────────────────────────────────────────────────

class TodayTestViewTests(TestCase):
    SESSION_KEY = 'test-session-today'

    def setUp(self):
        self.client = APIClient()
        self.client.defaults['HTTP_X_SESSION_KEY'] = self.SESSION_KEY

    def test_sin_test_hoy_devuelve_404(self):
        response = self.client.get(reverse('quiz-today'))
        self.assertEqual(response.status_code, 404)

    def test_con_test_activo_devuelve_sesion(self):
        make_daily_test()
        response = self.client.get(reverse('quiz-today'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('session', response.data)
        self.assertFalse(response.data['session']['is_completed'])

    def test_primera_visita_crea_game_session(self):
        make_daily_test()
        self.client.get(reverse('quiz-today'))
        self.assertEqual(GameSession.objects.count(), 1)

    def test_segunda_visita_no_duplica_sesion(self):
        make_daily_test()
        self.client.get(reverse('quiz-today'))
        self.client.get(reverse('quiz-today'))
        self.assertEqual(GameSession.objects.count(), 1)


# ─── SubmitGuessView ─────────────────────────────────────────────────────────

class SubmitGuessViewTests(TestCase):
    SESSION_KEY = 'test-session-guess'

    def setUp(self):
        self.client = APIClient()
        self.client.defaults['HTTP_X_SESSION_KEY'] = self.SESSION_KEY
        self.movie, _ = make_daily_test()
        self.client.get(reverse('quiz-today'))  # Crea la GameSession

    def test_acierto_completa_la_sesion(self):
        response = self.client.post(
            reverse('quiz-guess'), {'attempt': 'El Padrino'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['correct'])
        self.assertEqual(response.data['score'], 100)

    def test_acierto_con_titulo_original(self):
        response = self.client.post(
            reverse('quiz-guess'), {'attempt': 'The Godfather'}, format='json',
        )
        self.assertTrue(response.data['correct'])

    def test_fallo_revela_siguiente_pista(self):
        response = self.client.post(
            reverse('quiz-guess'), {'attempt': 'Blade Runner'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['correct'])
        self.assertIn('next_clue', response.data)

    def test_intento_en_sesion_completada_devuelve_400(self):
        self.client.post(reverse('quiz-guess'), {'attempt': 'El Padrino'}, format='json')
        response = self.client.post(
            reverse('quiz-guess'), {'attempt': 'El Padrino'}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_intento_vacio_devuelve_400(self):
        response = self.client.post(reverse('quiz-guess'), {'attempt': ''}, format='json')
        self.assertEqual(response.status_code, 400)
