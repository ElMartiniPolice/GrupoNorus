"""
Consumers WebSocket — Grupo Norus.

CP-ALE-01: alertas y notificaciones en tiempo real.

Autenticación (socket.js NO envía token):
- El identificador viene en la ruta: ws/notifications/<user_id>/.
- Soporte opcional ?token=<JWT access> para entornos que lo requieran.
- Payload saliente: {"type": ..., "data": {...}} — NotificationContext
  tolera ambos formatos (payload.data ? payload.data : payload).
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.models import Usuario


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """Canal de notificaciones en vivo, uno por usuario."""

    async def connect(self):
        user = await self.get_user()
        if user is None or not user.is_authenticated:
            # user_id inválido o token inválido → rechazar silenciosamente.
            await self.close()
            return
        self.user = user
        self.group_name = f'notificaciones_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        group = getattr(self, 'group_name', None)
        if group:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """El cliente solo escucha; los mensajes entrantes se ignoran."""

    async def notificar(self, event):
        """Handler del grupo: reenvía la notificación al cliente."""
        payload = event.get('payload', event)
        await self.send_json(payload)

    @database_sync_to_async
    def get_user(self):
        """Autentica por ?token= (opcional) o por user_id de la ruta."""
        user_id = self.scope.get('url_route', {}).get('kwargs', {}).get('user_id')
        query = parse_qs(self.scope.get('query_string', b'').decode('utf-8'))
        token = (query.get('token') or [None])[0]
        if token:
            try:
                access = AccessToken(token)
                user_id = access.payload.get('user_id') or user_id
            except Exception:
                pass
        if not user_id:
            return None
        try:
            return Usuario.objects.get(pk=user_id, is_active=True)
        except Usuario.DoesNotExist:
            return None
