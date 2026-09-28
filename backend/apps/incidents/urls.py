"""
Rutas de incidencias — api/incidents/ (CU8, CP-ALE-01).
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IncidenciaViewSet

router = DefaultRouter()
router.register('incidencias', IncidenciaViewSet, basename='incidencia')

urlpatterns = [
    path('', include(router.urls)),
]
