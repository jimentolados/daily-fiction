from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView,
    MeView, MeAchievementsView, GoogleAuthView, ChangePasswordView, ChangeEmailView,
)

urlpatterns = [
    # Autenticación clásica
    path('register/',       RegisterView.as_view(),       name='auth-register'),
    path('login/',          LoginView.as_view(),           name='auth-login'),
    path('logout/',         LogoutView.as_view(),          name='auth-logout'),
    path('token/refresh/',  TokenRefreshView.as_view(),    name='token-refresh'),

    # Google OAuth
    path('google/',         GoogleAuthView.as_view(),      name='auth-google'),

    # Perfil del usuario autenticado
    path('me/',             MeView.as_view(),              name='auth-me'),
    path('me/achievements/', MeAchievementsView.as_view(), name='auth-me-achievements'),
    path('me/password/',     ChangePasswordView.as_view(),  name='auth-me-password'),
    path('me/email/',        ChangeEmailView.as_view(),     name='auth-me-email'),
]
