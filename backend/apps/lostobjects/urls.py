from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ObjetoPerdidoViewSet

router = DefaultRouter()
router.register('objetos', ObjetoPerdidoViewSet, basename='objeto')

urlpatterns = [
    path('', include(router.urls)),
]
