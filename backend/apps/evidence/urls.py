"""Rutas de evidencias — Grupo Norus (api/evidence/)."""
from rest_framework.routers import DefaultRouter

from .views import EvidenciaFotograficaViewSet

router = DefaultRouter()
router.register(r'evidencias', EvidenciaFotograficaViewSet, basename='evidencia')

urlpatterns = router.urls
