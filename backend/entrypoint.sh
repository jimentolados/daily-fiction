#!/bin/sh
set -e

echo "Esperando a la base de datos..."
until python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()
from django.db import connection
connection.ensure_connection()
" 2>/dev/null; do
  sleep 1
done

echo "Base de datos lista."

python manage.py migrate --noinput
python manage.py loaddata apps/ranking/fixtures/achievements.json

python manage.py runserver 0.0.0.0:8000
