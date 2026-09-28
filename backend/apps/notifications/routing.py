"""
Enrutamiento WebSocket — Grupo Norus.

CP-ALE-01: canal personal por usuario.
socket.js conecta a ws/notifications/<user_id>/ (sin token; el
consumer autentica por user_id de la ruta, con soporte opcional ?token=).
"""
from django.urls import path

from .consumers import NotificationConsumer

websocket_urlpatterns = [
    path('ws/notifications/<int:user_id>/', NotificationConsumer.as_asgi()),
]
