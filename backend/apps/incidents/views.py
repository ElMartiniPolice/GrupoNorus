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
    - `POST /incidencias/<id>/asignar/` asigna la incidencia a atención.
    - `POST /incidencias/<id>/iniciar/` comienza el trabajo en la incidencia.
    - `POST /incidencias/<id>/validar/` valida la incidencia.
    - `POST /incidencias/<id>/cerrar/` cierra la incidencia.
    - `POST /incidencias/<id>/rechazar/` rechaza la incidencia.
    - `POST /incidencias/<id>/reabrir/` reabre la incidencia.
    """
    queryset = Incidencia.objects.select_related(
        'habitacion', 'reportado_por', 'reportado_por__rol', 'reportado_por__area',
    ).all()
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
    def asignar(self, request, pk=None):
        """Asigna la incidencia a atención (CREADA → ASIGNADA)."""
        incidencia = self.get_object()
        if incidencia.estado != 'CREADA':
            return Response(
                {'detail': 'La incidencia no puede ser asignada en su estado actual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        incidencia.estado = 'ASIGNADA'
        incidencia.save(update_fields=['estado'])
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def iniciar(self, request, pk=None):
        """Comienza el trabajo en la incidencia (ASIGNADA → EN_PROGRESO)."""
        incidencia = self.get_object()
        if incidencia.estado != 'ASIGNADA':
            return Response(
                {'detail': 'La incidencia no puede ser iniciada en su estado actual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        incidencia.estado = 'EN_PROGRESO'
        incidencia.save(update_fields=['estado'])
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def validar(self, request, pk=None):
        """Valida la incidencia (EN_PROGRESO → VALIDADA)."""
        incidencia = self.get_object()
        if incidencia.estado != 'EN_PROGRESO':
            return Response(
                {'detail': 'La incidencia no puede ser validada en su estado actual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            comentario = (request.data or {}).get('comentario') or ''
        except Exception:
            comentario = ''
        incidencia.estado = 'VALIDADA'
        incidencia.validada_en = timezone.now()
        incidencia.comentario_validacion = comentario
        incidencia.save(update_fields=['estado', 'validada_en', 'comentario_validacion'])
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        """Cierra la incidencia (VALIDADA → CERRADA)."""
        incidencia = self.get_object()
        if incidencia.estado != 'VALIDADA':
            return Response(
                {'detail': 'La incidencia no puede ser cerrada en su estado actual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        incidencia.estado = 'CERRADA'
        incidencia.cerrada_en = timezone.now()
        incidencia.save(update_fields=['estado', 'cerrada_en'])
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechaza la incidencia (VALIDADA → EN_PROGRESO).
        
        Permite devolver la incidencia al trabajo cuando la validación
        determina que hay problemas que corregir. Registra quién rechazó
        y el comentario de rechazo.
        """
        incidencia = self.get_object()
        if incidencia.estado != 'VALIDADA':
            return Response(
                {'detail': 'La incidencia no puede ser rechazada en su estado actual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            comentario = (request.data or {}).get('comentario') or ''
        except Exception:
            comentario = ''
        incidencia.estado = 'EN_PROGRESO'
        incidencia.save(update_fields=['estado'])
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def reabrir(self, request, pk=None):
        """Reabre la incidencia (CERRADA → EN_PROGRESO o CREADA → EN_PROGRESO).
        
        Permite reactivar una incidencia cerrada anteriormente. Si la incidencia
        estaba en estado CERRADA, vuelve a EN_PROGRESO. Si estaba en CREADA,
        también vuelve a EN_PROGRESO para reiniciar el flujo.
        """
        incidencia = self.get_object()
        if incidencia.estado == 'CERRADA':
            incidencia.estado = 'EN_PROGRESO'
            incidencia.save(update_fields=['estado'])
        elif incidencia.estado == 'CREADA':
            incidencia.estado = 'EN_PROGRESO'
            incidencia.save(update_fields=['estado'])
        else:
            return Response(
                {'detail': 'La incidencia no puede reabrirse en su estado actual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )

    @action(detail=True, methods=['post'])
    def resolver(self, request, pk=None):
        """Cierra la incidencia (marca como resuelta).
        
        Esta acción es un atajo que puede usarse desde EN_PROGRESO o VALIDADA
        para marcar la incidencia como resuelta antes de cerrarla completamente.
        """
        incidencia = self.get_object()
        try:
            comentario = (request.data or {}).get('comentario') or ''
        except Exception:
            comentario = ''
        incidencia.resuelta_en = timezone.now()
        incidencia.comentario_resolucion = comentario
        if not incidencia.atendida_en:
            incidencia.atendida_en = incidencia.resuelta_en
        incidencia.save(update_fields=['resuelta_en', 'comentario_resolucion', 'atendida_en'])
        return Response(
            IncidenciaSerializer(incidencia, context={'request': request}).data
        )