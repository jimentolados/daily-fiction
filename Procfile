web: gunicorn config.wsgi:application --chdir backend --workers 2 --timeout 120
release: python backend/manage.py migrate --noinput && python backend/manage.py ensure_superuser
