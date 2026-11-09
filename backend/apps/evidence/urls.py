"""Rutas de evidencias — Grupo Norus (api/evidence/)."""
from rest_framework.routers import DefaultRouter

from .views import EvidenciaFotograficaViewSet, ObjetoEncontradoViewSet

router = DefaultRouter()
router.register(r'evidencias', EvidenciaFotograficaViewSet, basename='evidencia')
router.register(r'objetos-perdidos', ObjetoEncontradoViewSet, basename='objeto-perdido')

urlpatterns = router.urls
