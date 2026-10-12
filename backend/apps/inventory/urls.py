from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InventarioItemViewSet

router = DefaultRouter()
router.register('items', InventarioItemViewSet, basename='inventario-item')

urlpatterns = [
    path('', include(router.urls)),
]
