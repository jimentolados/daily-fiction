from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import CustomUser


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_user(username='cinefilo', email='cinefilo@test.com', password='testpass123'):
    return CustomUser.objects.create_user(
        username=username,
        email=email,
        password=password,
        country='ES',
        city='Madrid',
    )


def auth_client(user):
    """APIClient con JWT del usuario dado."""
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


# ─── RegisterView ─────────────────────────────────────────────────────────────

class RegisterViewTests(TestCase):
    URL = '/api/v1/auth/register/'

    def test_registro_correcto_devuelve_201_y_tokens(self):
        response = APIClient().post(self.URL, {
            'email': 'nuevo@test.com',
            'username': 'nuevo',
            'password': 'Password123!',
            'country': 'ES',
            'city': 'Madrid',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('tokens', response.data)
        self.assertTrue(CustomUser.objects.filter(email='nuevo@test.com').exists())

    def test_email_duplicado_devuelve_400(self):
        make_user()
        response = APIClient().post(self.URL, {
            'email': 'cinefilo@test.com',
            'username': 'otro',
            'password': 'Password123!',
            'country': 'ES',
            'city': 'Madrid',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_username_duplicado_devuelve_400(self):
        make_user()
        response = APIClient().post(self.URL, {
            'email': 'otro@test.com',
            'username': 'cinefilo',
            'password': 'Password123!',
            'country': 'ES',
            'city': 'Madrid',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_email_se_guarda_en_minusculas(self):
        APIClient().post(self.URL, {
            'email': 'MAYUS@TEST.COM',
            'username': 'mayus',
            'password': 'Password123!',
            'country': 'ES',
            'city': 'Madrid',
        }, format='json')
        self.assertTrue(CustomUser.objects.filter(email='mayus@test.com').exists())


# ─── LoginView ────────────────────────────────────────────────────────────────

class LoginViewTests(TestCase):
    URL = '/api/v1/auth/login/'

    def setUp(self):
        self.user = make_user()

    def test_login_correcto_devuelve_tokens(self):
        response = APIClient().post(self.URL, {
            'identifier': 'cinefilo@test.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('tokens', response.data)

    def test_password_incorrecto_devuelve_400(self):
        response = APIClient().post(self.URL, {
            'identifier': 'cinefilo@test.com',
            'password': 'wrongpassword',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_usuario_inexistente_devuelve_400(self):
        response = APIClient().post(self.URL, {
            'identifier': 'noexiste@test.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)


# ─── MeView ───────────────────────────────────────────────────────────────────

class MeViewTests(TestCase):
    URL = '/api/v1/auth/me/'

    def setUp(self):
        self.user = make_user()

    def test_autenticado_devuelve_datos_del_usuario(self):
        response = auth_client(self.user).get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], 'cinefilo@test.com')
        self.assertIn('profile', response.data)

    def test_sin_autenticar_devuelve_401(self):
        response = APIClient().get(self.URL)
        self.assertEqual(response.status_code, 401)


# ─── ChangePasswordView ───────────────────────────────────────────────────────

class ChangePasswordViewTests(TestCase):
    URL = '/api/v1/auth/me/password/'

    def setUp(self):
        self.user = make_user()
        self.client = auth_client(self.user)

    def test_cambio_correcto(self):
        response = self.client.post(self.URL, {
            'current_password': 'testpass123',
            'new_password': 'NuevaPass456!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NuevaPass456!'))

    def test_password_actual_incorrecta_devuelve_400(self):
        response = self.client.post(self.URL, {
            'current_password': 'wrongpassword',
            'new_password': 'NuevaPass456!',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_nueva_password_corta_devuelve_400(self):
        response = self.client.post(self.URL, {
            'current_password': 'testpass123',
            'new_password': '123',
        }, format='json')
        self.assertEqual(response.status_code, 400)


# ─── ChangeEmailView ──────────────────────────────────────────────────────────

class ChangeEmailViewTests(TestCase):
    URL = '/api/v1/auth/me/email/'

    def setUp(self):
        self.user = make_user()
        self.client = auth_client(self.user)

    def test_cambio_correcto(self):
        response = self.client.post(self.URL, {
            'new_email': 'nuevo@test.com',
            'current_password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'nuevo@test.com')

    def test_email_ya_en_uso_devuelve_400(self):
        make_user(username='otro', email='otro@test.com')
        response = self.client.post(self.URL, {
            'new_email': 'otro@test.com',
            'current_password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_mismo_email_devuelve_400(self):
        response = self.client.post(self.URL, {
            'new_email': 'cinefilo@test.com',
            'current_password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_password_incorrecta_devuelve_400(self):
        response = self.client.post(self.URL, {
            'new_email': 'nuevo@test.com',
            'current_password': 'wrongpassword',
        }, format='json')
        self.assertEqual(response.status_code, 400)
