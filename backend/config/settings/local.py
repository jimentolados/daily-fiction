from .base import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Base de datos local: XAMPP MariaDB
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='dailyfiction_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='127.0.0.1'),
        'PORT': config('DB_PORT', default='5433'),
        'CONN_MAX_AGE': 60,
    }
}

# CORS: permitir peticiones desde el frontend (abrir archivo HTML local)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# No forzar HTTPS en local
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
