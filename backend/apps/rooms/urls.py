"""
Rutas de habitaciones — api/rooms/ (CU1/CU3/CU10, CP-HAB-01).
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    HabitacionViewSet,
    ItemInventarioViewSet,
    PlantillaInventarioViewSet,
    RegistroEstadiaViewSet,
    TipoHabitacionViewSet,
)

router = DefaultRouter()
router.register('habitaciones', HabitacionViewSet, basename='habitacion')
router.register('tipos', TipoHabitacionViewSet, basename='tipo_habitacion')
router.register('estadias', RegistroEstadiaViewSet, basename='registro_estadia')
router.register('inventario', ItemInventarioViewSet, basename='item_inventario')
router.register('plantillas-inventario', PlantillaInventarioViewSet, basename='plantilla_inventario')

urlpatterns = [
    path('', include(router.urls)),
]
