#!/usr/bin/env python
"""Wrapper para ejecutar manage.py desde la raíz del proyecto."""
import sys
import os

# Añadir backend/ al path para que Django encuentre el proyecto
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

if __name__ == '__main__':
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
