from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.views.static import serve as static_serve

FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend'

# Personalización del panel de administración
admin.site.site_header = 'Daily Fiction — Administración'
admin.site.site_title = 'Daily Fiction Admin'
admin.site.index_title = 'Panel de control'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/movies/', include('apps.movies.urls')),
    path('api/v1/quiz/', include('apps.quiz.urls')),
    path('api/v1/ranking/', include('apps.ranking.urls')),
]

# Servir archivos de media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Servir el frontend desde la raíz
    urlpatterns += [
        path('', RedirectView.as_view(url='/index.html', permanent=False)),
        re_path(r'^(?!admin|api|social-auth|media)(?P<path>.+)$', static_serve, {'document_root': FRONTEND_DIR}),
    ]
