"""
Vistas de habitaciones y estadías — Grupo Norus.

CU1: check-out (cierra la estadía → habitación pasa a LIMPIEZA).
CU3: check-in (la habitación pasa a OCUPADA).
CU10: monitoreo de habitaciones y conflictos de estadía.
CP-HAB-01: gestión de habitaciones (ADMINISTRADOR / RECEPCION).
CP-DP-02: un OPERARIO solo ve SUS habitaciones (las de sus tareas
      asignadas o de las incidencias que reportó).
"""
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrRecepcion, is_operario
from .models import (
    CambioEstadoHabitacion,
    ESTADOS_HABITACION,
    Habitacion,
    RegistroEstadia,
    TipoHabitacion,
)
from .serializers import (
    CambioEstadoHabitacionSerializer,
    HabitacionSerializer,
    RegistroEstadiaSerializer,
    TipoHabitacionSerializer,
)
from .services import habitaciones_del_operario


class TipoHabitacionViewSet(viewsets.ReadOnlyModelViewSet):
    """Catálogo de tipos de habitación (solo lectura)."""
    queryset = TipoHabitacion.objects.all()
    serializer_class = TipoHabitacionSerializer
    permission_classes = [IsAuthenticated]


class HabitacionViewSet(viewsets.ModelViewSet):
    """
    Habitaciones — CP-HAB-01.

    - Lectura: cualquier usuario autenticado (monitoreo CU10).
    - Escritura (create/update/PATCH/delete): ADMINISTRADOR o RECEPCION.
    - CP-DP-02: un OPERARIO solo ve SUS habitaciones (las de sus tareas
      asignadas o de las incidencias que reportó).
    """
    queryset = Habitacion.objects.select_related('tipo').all()
    serializer_class = HabitacionSerializer
    filterset_fields = ['estado', 'tipo']

    def get_queryset(self):
        """CP-DP-02 — Restringe listado/detalle a las habitaciones del operario."""
        qs = super().get_queryset()
        if is_operario(self.request.user):
            qs = qs.filter(pk__in=habitaciones_del_operario(self.request.user))
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrRecepcion()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """
        Cambia el estado de una habitación y deja registro en el historial.

        - Cualquier usuario autenticado puede cambiar el estado de las
          habitaciones que puede ver (CP-DP-02: `get_object()` aplica el
          scoping, así que un operario solo llega a SUS habitaciones).
        - `estado`: nuevo estado (DISPONIBLE/OCUPADA/LIMPIEZA/MANTENCION).
        - `imagen` (multipart, opcional): fotografía de la habitación.
        """
        habitacion = self.get_object()
        estado = request.data.get('estado')
        if estado not in [opcion[0] for opcion in ESTADOS_HABITACION]:
            return Response(
                {'detail': 'Estado inválido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cambio = CambioEstadoHabitacion.objects.create(
            habitacion=habitacion,
            estado_anterior=habitacion.estado,
            estado_nuevo=estado,
            foto=request.FILES.get('imagen'),
            cambiado_por=request.user,
        )
        Habitacion.objects.filter(pk=habitacion.pk).update(estado=estado)
        return Response(
            CambioEstadoHabitacionSerializer(
                cambio, context={'request': request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'])
    def cambios_estado(self, request, pk=None):
        """Historial de cambios de estado de la habitación (con fotos)."""
        habitacion = self.get_object()
        cambios = habitacion.cambios_estado.select_related('cambiado_por')
        return Response(
            CambioEstadoHabitacionSerializer(
                cambios, many=True, context={'request': request},
            ).data,
        )


class RegistroEstadiaViewSet(viewsets.ModelViewSet):
    """
    Registros de estadía — CU1/CU3/CU10.

    - `?habitacion=<id>` filtra las estadías de una habitación.
    - Crear una estadía = check-in (CU3): la habitación pasa a OCUPADA.
      La `salida` enviada por el frontend se guarda como `salida_prevista`
      y `salida` queda en NULL (estadía activa).
    - Si ya existe una estadía activa en la misma habitación, se marca
      `conflicto=True` (CU10 — alimenta el KPI3).
    - `POST /estadias/<id>/checkout/` = check-out (CU1): cierra la estadía
      activa y la habitación pasa a LIMPIEZA.
    """
    queryset = RegistroEstadia.objects.select_related('habitacion').all()
    serializer_class = RegistroEstadiaSerializer
    filterset_fields = ['habitacion']

    def get_queryset(self):
        """CP-DP-02 — Un OPERARIO solo ve estadías de sus habitaciones."""
        qs = super().get_queryset()
        if is_operario(self.request.user):
            qs = qs.filter(
                habitacion__in=habitaciones_del_operario(self.request.user),
            )
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrRecepcion()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # La fecha de salida del formulario es la SALIDA PREVISTA:
        # la estadía activa se detecta con `salida IS NULL`.
        salida_prevista = serializer.validated_data.pop('salida', None)
        habitacion = serializer.validated_data.get('habitacion')
        conflicto = RegistroEstadia.objects.filter(
            habitacion=habitacion,
            salida__isnull=True,
        ).exists()
        serializer.save(
            salida=None,
            salida_prevista=salida_prevista,
            conflicto=conflicto,
        )
        # CU3 — Check-in: la habitación queda OCUPADA.
        Habitacion.objects.filter(pk=habitacion.pk).update(estado='OCUPADA')

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """CU1 — Check-out: cierra la estadía activa y actualiza la habitación."""
        estadia = self.get_object()
        if estadia.salida:
            return Response(
                {'detail': 'La estadía ya está cerrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        estadia.salida = timezone.localdate()
        estadia.save(update_fields=['salida'])
        Habitacion.objects.filter(pk=estadia.habitacion_id).update(
            estado='LIMPIEZA',
        )
        return Response(
            RegistroEstadiaSerializer(estadia, context={'request': request}).data
        )
