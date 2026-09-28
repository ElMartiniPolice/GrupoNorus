"""
Vistas de notificaciones — Grupo Norus.

CP-ALE-01: alertas en tiempo real (WebSocket) + listado REST.

Contrato (NotificationContext):
- GET   /notificaciones/              → propias del usuario (?leida=true|false).
- PATCH /notificaciones/<id>/         → {leida: true}.
- POST  /notificaciones/marcar_todas/ → cuerpo vacío; marca todas como leídas.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdmin

from .models import Notificacion
from .serializers import NotificacionSerializer


class NotificacionViewSet(viewsets.ModelViewSet):
    """
    Notificaciones del usuario autenticado.

    Cada usuario ve (y marca como leídas) solo las suyas.
    La creación la realiza el backend vía services.notificar.
    """
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['leida']

    def get_queryset(self):
        return (
            Notificacion.objects
            .filter(usuario=self.request.user)
            .select_related('usuario')
        )

    def get_permissions(self):
        if self.action in ('create', 'update', 'destroy'):
            # Las notificaciones las genera el backend (services.notificar).
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    @action(detail=False, methods=['post'])
    def marcar_todas(self, request):
        """Marca todas las notificaciones pendientes del usuario como leídas."""
        actualizadas = self.get_queryset().filter(leida=False).update(leida=True)
        return Response(
            {'detail': f'{actualizadas} notificación(es) marcadas como leídas.'}
        )
