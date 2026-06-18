from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser, UserProfile


# ─── Perfil ──────────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            'movies_solved_count', 'current_streak',
            'max_streak', 'total_points_all_time', 'last_played_date',
        )
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    """Datos completos del usuario (para GET /me/)."""
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = (
            'id', 'email', 'username', 'full_name',
            'country', 'city', 'date_joined', 'profile',
        )
        read_only_fields = ('id', 'date_joined', 'profile')


# ─── Registro ────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )

    class Meta:
        model = CustomUser
        fields = ('email', 'username', 'full_name', 'country', 'city', 'password')
        extra_kwargs = {
            'full_name': {'required': False, 'allow_blank': True},
            'country':   {'required': True, 'allow_blank': False},
            'city':      {'required': True, 'allow_blank': False},
        }

    def validate_email(self, value):
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este email.')
        return value.lower()

    def validate_username(self, value):
        if CustomUser.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Este nombre de usuario ya está en uso.')
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
            country=validated_data.get('country', ''),
            city=validated_data.get('city', ''),
        )
        return user


# ─── Login ───────────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()   # email o nombre de usuario
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['identifier'].strip(),
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError(
                'Usuario, correo o contraseña incorrectos.', code='authorization'
            )
        if not user.is_active:
            raise serializers.ValidationError('Esta cuenta está desactivada.')
        attrs['user'] = user
        return attrs


# ─── Actualizar perfil ───────────────────────────────────────────────────────

class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('username', 'full_name', 'email', 'country', 'city')

    def validate_username(self, value):
        user = self.instance
        if CustomUser.objects.filter(username__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('Este nombre de usuario ya está en uso.')
        return value

    def validate_email(self, value):
        value = value.lower().strip()
        user = self.instance
        if CustomUser.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este correo.')
        return value


# ─── Google OAuth ────────────────────────────────────────────────────────────

class GoogleAuthSerializer(serializers.Serializer):
    """
    Recibe el access_token de Google (obtenido por el frontend con Google Identity).
    El backend lo valida contra la API de Google y crea o recupera el usuario.
    """
    access_token = serializers.CharField()
