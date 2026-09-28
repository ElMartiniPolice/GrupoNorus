"""URLs de gestión de usuarios — api/users/ (CP-USR-01)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.views import AreaViewSet, RolViewSet, UsuarioViewSet

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')
router.register('roles', RolViewSet, basename='rol')
router.register('areas', AreaViewSet, basename='area')

urlpatterns = [
    path('', include(router.urls)),
]
