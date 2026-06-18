import uuid
import requests
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError

from apps.ranking.models import UserAchievement, Achievement
from .models import CustomUser
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserSerializer, UpdateProfileSerializer, GoogleAuthSerializer,
)
from .throttles import LoginRateThrottle, RegisterRateThrottle


def get_tokens_for_user(user):
    """Genera par de tokens JWT (access + refresh) para un usuario."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# ─── Registro ────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        tokens = get_tokens_for_user(user)

        # Otorgar logro de bienvenida
        try:
            achievement = Achievement.objects.get(code='FIRST_BLOOD')
            UserAchievement.objects.get_or_create(user=user, achievement=achievement)
        except Achievement.DoesNotExist:
            pass

        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'message': '¡Cuenta creada correctamente! Bienvenido a Daily Fiction.',
        }, status=status.HTTP_201_CREATED)


# ─── Login ───────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
        })


# ─── Logout (invalida el refresh token) ──────────────────────────────────────

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Se requiere el refresh token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            # Si el token ya es inválido o no existe blacklist, simplemente ignoramos
            pass
        return Response({'message': 'Sesión cerrada correctamente.'})


# ─── Perfil del usuario autenticado ──────────────────────────────────────────

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(UserSerializer(request.user).data)


# ─── Logros del usuario autenticado ──────────────────────────────────────────

class MeAchievementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        achievements = request.user.achievements.select_related('achievement').order_by('-earned_at')
        data = [
            {
                'code': ua.achievement.code,
                'name': ua.get_display_name(),
                'description': ua.achievement.description,
                'icon': ua.achievement.icon,
                'category': ua.achievement.category,
                'earned_at': ua.earned_at.isoformat(),
                'metadata': ua.metadata,
            }
            for ua in achievements
        ]
        return Response(data)


# ─── Google OAuth ─────────────────────────────────────────────────────────────

class GoogleAuthView(APIView):
    """
    Flujo:
    1. El frontend obtiene un access_token de Google (Google Identity Services).
    2. Envía ese token aquí.
    3. Validamos con la API de Google y obtenemos email, nombre y google_id.
    4. Si el usuario existe lo autenticamos; si no, lo creamos.
    5. Devolvemos JWT tokens.
    """
    permission_classes = [AllowAny]

    GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        access_token = serializer.validated_data['access_token']

        # Verificar el token con Google
        try:
            response = requests.get(
                self.GOOGLE_USERINFO_URL,
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            response.raise_for_status()
            google_data = response.json()
        except requests.RequestException:
            return Response(
                {'error': 'No se pudo verificar el token de Google. Inténtalo de nuevo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = google_data.get('email', '').lower()
        google_id = google_data.get('sub')  # 'sub' es el ID único de Google
        given_name = google_data.get('given_name', '')
        family_name = google_data.get('family_name', '')
        full_name = f"{given_name} {family_name}".strip()

        if not email or not google_id:
            return Response(
                {'error': 'No se pudieron obtener los datos de Google.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear o recuperar el usuario
        with transaction.atomic():
            user = CustomUser.objects.filter(google_id=google_id).first()

            if not user:
                user = CustomUser.objects.filter(email=email).first()
                if user:
                    # El usuario ya existe con email normal → vinculamos su cuenta de Google
                    user.google_id = google_id
                    user.save(update_fields=['google_id'])
                else:
                    # Usuario nuevo: creamos cuenta
                    base_username = email.split('@')[0]
                    username = self._unique_username(base_username)
                    user = CustomUser.objects.create_user(
                        email=email,
                        username=username,
                        password=None,          # Sin contraseña (solo OAuth)
                        full_name=full_name,
                        google_id=google_id,
                    )
                    # Logro de bienvenida
                    try:
                        achievement = Achievement.objects.get(code='FIRST_BLOOD')
                        UserAchievement.objects.get_or_create(user=user, achievement=achievement)
                    except Achievement.DoesNotExist:
                        pass

        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
        })

    def _unique_username(self, base):
        """Genera un username único basado en la parte local del email."""
        username = base[:50]
        if not CustomUser.objects.filter(username=username).exists():
            return username
        # Sufijo UUID corto para evitar colisiones bajo concurrencia
        return f"{base[:43]}_{uuid.uuid4().hex[:7]}"


# ─── Cambio de contraseña ─────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password or not new_password:
            return Response(
                {'error': 'Se requieren current_password y new_password.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(new_password) < 8:
            return Response(
                {'error': 'La contraseña debe tener al menos 8 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not request.user.check_password(current_password):
            return Response(
                {'error': 'La contraseña actual no es correcta.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'message': 'Contraseña actualizada correctamente.'})


# ─── Cambio de email ──────────────────────────────────────────────────────────

class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_email = request.data.get('new_email', '').strip().lower()
        current_password = request.data.get('current_password', '')

        if not new_email:
            return Response(
                {'error': 'Se requiere el campo new_email.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Usuarios con contraseña deben verificarla; los de OAuth puro no tienen
        if request.user.has_usable_password():
            if not current_password:
                return Response(
                    {'error': 'Se requiere la contraseña actual para cambiar el email.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not request.user.check_password(current_password):
                return Response(
                    {'error': 'La contraseña actual no es correcta.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if new_email == request.user.email:
            return Response(
                {'error': 'El nuevo email coincide con el actual.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if CustomUser.objects.filter(email__iexact=new_email).exclude(pk=request.user.pk).exists():
            return Response(
                {'error': 'Ya existe una cuenta con ese correo electrónico.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.email = new_email
        request.user.save(update_fields=['email'])
        return Response({'message': 'Email actualizado correctamente.', 'email': new_email})


# ─── Re-exportar TokenRefreshView de simplejwt ───────────────────────────────

CustomTokenRefreshView = TokenRefreshView
