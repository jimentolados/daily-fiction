import datetime

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import CustomUser
from apps.ranking.models import MonthlyScore


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_user(username, email, country='ES', city='Madrid'):
    return CustomUser.objects.create_user(
        username=username, email=email,
        password='testpass123', country=country, city=city,
    )


def make_score(user, score, year=None, month=None):
    today = datetime.date.today()
    return MonthlyScore.objects.create(
        user=user,
        year=year or today.year,
        month=month or today.month,
        total_score=score,
        games_played=1,
        correct_guesses=1,
    )


# ─── RankingView ─────────────────────────────────────────────────────────────

class RankingViewTests(TestCase):
    URL = '/api/v1/ranking/monthly/'

    def setUp(self):
        self.client = APIClient()

    def test_ranking_vacio_devuelve_count_cero(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)

    def test_jugadores_ordenados_por_puntuacion(self):
        u1 = make_user('primero', 'primero@test.com')
        u2 = make_user('segundo', 'segundo@test.com')
        make_score(u1, 200)
        make_score(u2, 100)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        nombres = [e['username'] for e in response.data['results']]
        self.assertEqual(nombres[0], 'primero')
        self.assertEqual(nombres[1], 'segundo')

    def test_filtro_por_pais(self):
        u_es = make_user('espanol', 'es@test.com', country='ES')
        u_mx = make_user('mexicano', 'mx@test.com', country='MX')
        make_score(u_es, 100)
        make_score(u_mx, 80)

        response = self.client.get(self.URL, {'country': 'ES'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['username'], 'espanol')

    def test_filtro_por_ciudad(self):
        u_mad = make_user('madrileno', 'mad@test.com', city='Madrid')
        u_bcn = make_user('barcelones', 'bcn@test.com', city='Barcelona')
        make_score(u_mad, 150)
        make_score(u_bcn, 120)

        response = self.client.get(self.URL, {'city': 'Madrid'})
        self.assertEqual(response.data['count'], 1)


# ─── RankingSummaryView ───────────────────────────────────────────────────────

class RankingSummaryViewTests(TestCase):
    URL = '/api/v1/ranking/monthly/summary/'

    def setUp(self):
        self.client = APIClient()

    def test_sin_jugadores_devuelve_top3_vacio(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['top3'], [])
        self.assertEqual(response.data['total_players'], 0)

    def test_top3_contiene_los_tres_primeros(self):
        for i, name in enumerate(['oro', 'plata', 'bronce', 'cuarto']):
            u = make_user(name, f'{name}@test.com')
            make_score(u, (4 - i) * 100)

        response = self.client.get(self.URL)
        self.assertEqual(len(response.data['top3']), 3)
        self.assertEqual(response.data['total_players'], 4)

    def test_usuario_autenticado_ve_su_posicion(self):
        user = make_user('yo', 'yo@test.com')
        make_score(user, 50)

        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get(self.URL)
        self.assertIsNotNone(response.data['user_position'])
        self.assertEqual(response.data['user_position']['username'], 'yo')
