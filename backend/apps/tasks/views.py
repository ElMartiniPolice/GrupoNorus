"""
Vistas de tareas — Grupo Norus.

CU2: asignación de tareas (ADMINISTRADOR / RECEPCION).
CU5: consulta de tareas (OPERARIO ve las suyas; ?mias=true para "mis tareas").
CU6: actualización de estado (cualquier rol autenticado, con historial).
CU9: validación de tarea (ADMINISTRADOR) — POST /tareas/<id>/validar/.
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, is_admin, is_recepcion
from apps.notifications.services import notificar

from .models import AsignacionTarea, HistorialEstadoTarea
from .serializers import AsignacionTareaSerializer, HistorialEstadoTareaSerializer


class AsignacionTareaViewSet(viewsets.ModelViewSet):
    """
    Tareas — CU2/CU5/CU6/CU9.

    - OPERARIO solo ve sus tareas; ADMINISTRADOR/RECEPCION ven todas.
    - `?mias=true` filtra por el usuario autenticado.
    - Crear una tarea registra el historial inicial y NOTIFICA al
      responsable (CreateTaskScreen: "notificará al responsable").
    - PATCH {estado} (CU6) queda registrado en el historial.
    """
    queryset = AsignacionTarea.objects.select_related(
        'habitacion', 'asignado_a',
    ).all()
    serializer_class = AsignacionTareaSerializer
    filterset_fields = ['estado', 'prioridad', 'habitacion', 'asignado_a']

    def get_permissions(self):
        if self.action == 'validar':
            # CU9 — validación por ADMINISTRADOR.
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # CU5 — OPERARIO solo ve sus tareas asignadas.
        if not (is_admin(user) or is_recepcion(user)):
            qs = qs.filter(asignado_a=user)
        # ?mias=true — solo mis tareas.
        if str(self.request.query_params.get('mias', '')).lower() in ('true', '1'):
            qs = qs.filter(asignado_a=user)
        return qs

    def perform_create(self, serializer):
        tarea = serializer.save()
        # Historial inicial (creación en estado PENDIENTE).
        HistorialEstadoTarea.objects.create(
            tarea=tarea,
            estado_nuevo=tarea.estado,
            usuario=self.request.user,
        )
        # CU2 — notificar al responsable asignado.
        notificar(
            usuario_id=tarea.asignado_a_id,
            titulo='Nueva tarea asignada',
            mensaje=(
                f'Se te asignó la tarea "{tarea.titulo}" '
                f'(prioridad {tarea.get_prioridad_display()}).'
            ),
        )

    def perform_update(self, serializer):
        tarea = serializer.save()
        # CU6 — registrar cambio de estado en el historial.
        if 'estado' in serializer.validated_data:
            HistorialEstadoTarea.objects.create(
                tarea=tarea,
                estado_nuevo=tarea.estado,
                usuario=self.request.user,
            )

    @action(detail=True, methods=['post'])
    def validar(self, request, pk=None):
        """CU9 — Validar tarea (ADMINISTRADOR): marca la tarea como COMPLETADA."""
        tarea = self.get_object()
        if tarea.estado == 'COMPLETADA':
            return Response(
                {'detail': 'La tarea ya está completada y validada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tarea.estado = 'COMPLETADA'
        tarea.save(update_fields=['estado'])
        HistorialEstadoTarea.objects.create(
            tarea=tarea,
            estado_nuevo='COMPLETADA',
            usuario=request.user,
        )
        return Response(
            AsignacionTareaSerializer(tarea, context={'request': request}).data
        )

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Bitácora de cambios de estado (TaskDetailScreen)."""
        historial = self.get_object().historial.select_related('usuario').all()
        serializer = HistorialEstadoTareaSerializer(
            historial, many=True, context={'request': request},
        )
        return Response(serializer.data)
