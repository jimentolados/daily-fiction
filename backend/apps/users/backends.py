from django.contrib.auth.backends import ModelBackend
from apps.users.models import CustomUser


class EmailOrUsernameBackend(ModelBackend):
    """Permite login con email O username (útil para el admin de Django)."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Intentar por email primero
            user = CustomUser.objects.get(email=username)
        except CustomUser.DoesNotExist:
            try:
                # Si no, intentar por username
                user = CustomUser.objects.get(username=username)
            except CustomUser.DoesNotExist:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
