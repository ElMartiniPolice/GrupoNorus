"""URLs principales — Grupo Norus API."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/users/', include('apps.users.urls_users')),
    path('api/rooms/', include('apps.rooms.urls')),
    path('api/tasks/', include('apps.tasks.urls')),
    path('api/incidents/', include('apps.incidents.urls')),
    path('api/evidence/', include('apps.evidence.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    # Ley N° 21.719: aviso de privacidad, consentimiento y derechos del titular.
    path('api/privacy/', include('apps.privacy.urls')),
    path('api/core/', include('apps.core.urls')),
]

if settings.DEBUG:
    # Solo en desarrollo: evidencias subidas localmente (fallback sin S3)
    # y archivos estáticos. En producción los sirve S3/NGINX (CP-FOT-01).
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
