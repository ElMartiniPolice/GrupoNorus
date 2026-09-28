"""
Rutas de tareas — api/tasks/ (CU2/CU5/CU6/CU9).
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AsignacionTareaViewSet

router = DefaultRouter()
router.register('tareas', AsignacionTareaViewSet, basename='asignacion_tarea')

urlpatterns = [
    path('', include(router.urls)),
]
