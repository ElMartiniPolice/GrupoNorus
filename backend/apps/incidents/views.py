"""
Vistas de incidencias — Grupo Norus.

CU8: reporte y gestión de incidencias con SLA por severidad.
CP-ALE-01: alerta automática (WebSocket) para incidencias CRÍTICAS.
"""
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import is_admin, is_recepcion
from apps.notifications.services import notificar
from apps.users.models import Usuario

from .models import Incidencia
from .serializers import IncidenciaSerializer


class IncidenciaViewSet(viewsets.ModelViewSet):
    """
    Incidencias — CU8.

    - OPERARIO ve solo las que reportó; ADMINISTRADOR/RECEPCION ven todas.
    - `reportado_por` se asigna automáticamente al usuario autenticado.
    - Severidad CRÍTICA dispara una alerta automática a los coordinadores
      (ADMINISTRADOR y RECEPCION) — CP-ALE-01.
    - `POST /incidencias/<id>/atender/` marca la atención (SLA de respuesta).
    - `POST /incidencias/<id>/resolver/` cierra la incidencia
      (acepta cuerpo vacío o {comentario}).
    """
    queryset = Incidencia.objects.select_related('habitacion', 'reportado_por').all()
    serializer_class = IncidenciaSerializer
    filterset_fields = ['severidad', 'habitacion', 'requiere_evidencia']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not (is_admin(user) or is_recepcion(user)):
            qs = qs.filter(reportado_por=user)
        return qs

    def perform_create(self, serializer):
        incidencia = serializer.save(reportado_por=self.request.user)
        # CP-ALE-01 — alerta automática para incidencias críticas.
        if incidencia.severidad == 'CRITICO':
            numero = incidencia.habitacion.numero if incidencia.habitacion else '—'
            mensaje = (
                f'Incidencia crítica: "{incidencia.titulo}" en habitación {numero}. '
                f'Requiere atención inmediata.'
            )
            coordinadores = Usuario.objects.filter(
                is_active=True,
                rol__nombre__in=['ADMINISTRADOR', 'RECEPCION'],
            )
            for coordinador in coordinadores:
                notificar(coordinador.id, 'Alerta: incidencia crítica', mensaje)

    @action(detail=True, methods=['post'])
    def atender(self, request, pk=None):
        """Marca la incidencia como atendida (inicia SLA de resolución)."""
        incidencia = self.get_object()
        if incidencia.atendida_en:
            return Response(
                {'detail': 'La incidencia ya fue atendida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        incidencia.atendida_en = timezone.now()
        incidencia.save(update_fields=['atendida_en'])
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def resolver(self, request, pk=None):
        """Cierra la incidencia (acepta cuerpo vacío o {comentario})."""
        incidencia = self.get_object()
        if incidencia.resuelta_en:
            return Response(
                {'detail': 'La incidencia ya está resuelta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            comentario = (request.data or {}).get('comentario') or ''
        except Exception:
            comentario = ''
        incidencia.resuelta_en = timezone.now()
        incidencia.comentario_resolucion = comentario
        update_fields = ['resuelta_en', 'comentario_resolucion']
        if not incidencia.atendida_en:
            incidencia.atendida_en = incidencia.resuelta_en
            update_fields.append('atendida_en')
        incidencia.save(update_fields=update_fields)
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )
