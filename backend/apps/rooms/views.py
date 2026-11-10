"""
Vistas de habitaciones y estadías — Grupo Norus.

CU1: check-out (cierra la estadía → habitación pasa a LIMPIEZA).
CU3: check-in (la habitación pasa a OCUPADA).
CU10: monitoreo de habitaciones y conflictos de estadía.
CP-HAB-01: gestión de habitaciones (ADMINISTRADOR / RECEPCION).
CP-DP-02: un OPERARIO solo ve SUS habitaciones (las de sus tareas
      asignadas o de las incidencias que reportó).
"""
from django.db import models
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import (
    IsAdmin,
    IsAdminOrRecepcion,
    IsAdminOrSupervisor,
    is_operario,
)
from apps.notifications.services import notificar
from apps.users.models import Usuario
from .models import (
    CambioEstadoHabitacion,
    ESTADOS_HABITACION,
    Habitacion,
    ItemInventario,
    PlantillaInventario,
    RegistroEstadia,
    TipoHabitacion,
)
from .serializers import (
    CambioEstadoHabitacionSerializer,
    HabitacionMiniSerializer,
    HabitacionSerializer,
    ItemInventarioSerializer,
    PlantillaInventarioSerializer,
    RegistroEstadiaSerializer,
    TipoHabitacionSerializer,
)
from .services import aplicar_plantilla_a_habitacion, habitaciones_del_operario


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

    @action(
        detail=False,
        methods=['get'],
        url_path='catalogo-objetos-perdidos',
        permission_classes=[IsAuthenticated],
    )
    def catalogo_objetos_perdidos(self, request):
        """Catálogo mínimo para registrar hallazgos desde cualquier rol."""
        habitaciones = Habitacion.objects.order_by('numero')
        return Response(HabitacionMiniSerializer(habitaciones, many=True).data)

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdmin()]
        if self.action in ('update', 'partial_update') and 'asignada_a' in self.request.data:
            return [IsAdminOrSupervisor()]
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'aplicar_plantilla'):
            return [IsAdminOrRecepcion()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        habitacion = serializer.save()
        # Aplica automáticamente la plantilla estándar si existe para el tipo de habitación
        aplicar_plantilla_a_habitacion(habitacion, notificar_operario=True)

    def perform_update(self, serializer):
        hab_anterior = self.get_object()
        asignada_anterior_id = hab_anterior.asignada_a_id
        habitacion = serializer.save()

        # Si se asigna una nueva operaria de housekeeping a la habitación
        if habitacion.asignada_a_id and habitacion.asignada_a_id != asignada_anterior_id:
            faltantes = habitacion.inventario.filter(
                models.Q(estado__in=['SOLICITADO', 'FALTANTE', 'PENDIENTE_VALIDACION'])
                | models.Q(cantidad_actual__lt=models.F('cantidad_esperada'))
            )
            if faltantes.exists():
                detalle_items = ', '.join([
                    f'{f.nombre} (hay {f.cantidad_actual}/{f.cantidad_esperada})'
                    for f in faltantes[:4]
                ])
                if faltantes.count() > 4:
                    detalle_items += f' y {faltantes.count() - 4} más'
                notificar(
                    habitacion.asignada_a_id,
                    f'Faltantes en Hab. {habitacion.numero}',
                    (
                        f'Se te ha asignado la habitación {habitacion.numero}. '
                        f'Atención: tiene {faltantes.count()} artículo(s) faltante(s) en su inventario: {detalle_items}.'
                    ),
                )
            else:
                notificar(
                    habitacion.asignada_a_id,
                    f'Habitación {habitacion.numero} asignada',
                    f'Se te ha asignado la habitación {habitacion.numero} para housekeeping.',
                )

    @action(detail=True, methods=['post'])
    def aplicar_plantilla(self, request, pk=None):
        """
        Aplica o sincroniza manualmente la plantilla estándar según el tipo de habitación.
        Accesible para ADMINISTRADOR y RECEPCIÓN.
        """
        habitacion = self.get_object()
        sobrescribir = bool(request.data.get('sobrescribir', False))
        creados, actualizados = aplicar_plantilla_a_habitacion(
            habitacion,
            sobrescribir_cantidades=sobrescribir,
            notificar_operario=True,
        )
        return Response({
            'detail': (
                f'Plantilla aplicada para la habitación {habitacion.numero}: '
                f'{creados} artículos nuevos incorporados, {actualizados} actualizados.'
            ),
            'creados': creados,
            'actualizados': actualizados,
        })

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

    @action(detail=True, methods=['get'])
    def inventario(self, request, pk=None):
        """Lista los ítems de inventario de la habitación."""
        habitacion = self.get_object()
        items = habitacion.inventario.select_related('solicitado_por').all()
        return Response(ItemInventarioSerializer(items, many=True).data)


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
            registrado_por=self.request.user,
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


class PlantillaInventarioViewSet(viewsets.ModelViewSet):
    """
    Plantillas de dotación estándar por tipo de habitación.
    - Creación y edición: ADMINISTRADOR o RECEPCIÓN.
    - Consulta: Cualquier usuario autenticado.
    """
    queryset = PlantillaInventario.objects.select_related('tipo_habitacion').all()
    serializer_class = PlantillaInventarioSerializer
    filterset_fields = ['tipo_habitacion', 'categoria']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrRecepcion()]
        return [IsAuthenticated()]


class ItemInventarioViewSet(viewsets.ModelViewSet):
    """
    Ítems de inventario de habitaciones.
    - OPERARIO accede a los ítems de sus habitaciones asignadas (CP-DP-02).
    - Creación y eliminación reservadas a ADMINISTRADOR y RECEPCIÓN.
    - Reportar faltantes: todos los usuarios autenticados.
    - Marcar repuesto: solo la persona asignada a la habitación; queda
      PENDIENTE_VALIDACION hasta que ADMINISTRACIÓN o RECEPCIÓN lo valide.
    """
    queryset = ItemInventario.objects.select_related('habitacion', 'solicitado_por', 'habitacion__asignada_a').all()
    serializer_class = ItemInventarioSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['habitacion', 'categoria', 'estado']

    def get_queryset(self):
        qs = super().get_queryset()
        if is_operario(self.request.user):
            qs = qs.filter(habitacion__in=habitaciones_del_operario(self.request.user))
        return qs

    def get_permissions(self):
        if self.action in ('create', 'destroy', 'validar_reposicion'):
            return [IsAdminOrRecepcion()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def reportar_faltante(self, request, pk=None):
        """
        Reporta un artículo como faltante.
        Permitido a cualquier usuario autenticado y notifica a coordinación
        y a la persona asignada a la habitación.
        """
        item = self.get_object()
        notas = str(request.data.get('notas', '')).strip()

        # Parsear cantidad_actual
        cantidad_actual = request.data.get('cantidad_actual')
        try:
            cantidad_actual = int(cantidad_actual)
            if cantidad_actual < 0:
                cantidad_actual = 0
            if cantidad_actual > item.cantidad_esperada:
                cantidad_actual = item.cantidad_esperada
        except (ValueError, TypeError):
            cantidad_actual = 0

        item.cantidad_actual = cantidad_actual
        item.estado = 'FALTANTE'
        item.notas = notas
        item.solicitado_en = timezone.now()
        item.solicitado_por = request.user
        item.save()

        solicitante = (
            f'{getattr(request.user, "nombre", "")} '
            f'{getattr(request.user, "apellido", "")}'
        ).strip() or 'Personal'
        faltan = max(0, item.cantidad_esperada - item.cantidad_actual)
        mensaje = (
            f'Marcado como faltante por {solicitante}: "{item.nombre}" en habitación '
            f'{item.habitacion.numero}: '
            f'hay {item.cantidad_actual} de {item.cantidad_esperada} (faltan {faltan}).'
        )
        if notas:
            mensaje += f' Observación: {notas}'

        coordinadores = Usuario.objects.filter(
            is_active=True,
            rol__nombre__in=['ADMINISTRADOR', 'RECEPCION'],
        )
        destinatarios = {request.user.id}
        destinatarios.update(coordinador.id for coordinador in coordinadores)
        if item.habitacion.asignada_a_id:
            destinatarios.add(item.habitacion.asignada_a_id)
        for destinatario_id in destinatarios:
            notificar(destinatario_id, f'Faltante Hab. {item.habitacion.numero}', mensaje)

        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=['post'])
    def marcar_repuesto(self, request, pk=None):
        """
        La persona asignada a la habitación marca el artículo como repuesto.
        La reposición queda pendiente de validación por ADMINISTRACIÓN o RECEPCIÓN.
        """
        item = self.get_object()
        if item.habitacion.asignada_a_id != request.user.id:
            return Response(
                {'detail': 'Solo la persona asignada a la habitación puede marcar el artículo como repuesto.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        solicitante = (
            f'{getattr(request.user, "nombre", "")} '
            f'{getattr(request.user, "apellido", "")}'
        ).strip() or 'Personal'
        item.repuesto_por = request.user
        item.repuesto_en = timezone.now()
        item.estado = 'PENDIENTE_VALIDACION'
        item.cantidad_actual = item.cantidad_esperada
        item.save()

        mensaje = (
            f'{solicitante} marcó como repuesto "{item.nombre}" en la habitación '
            f'{item.habitacion.numero}. Requiere validación de coordinación.'
        )
        coordinadores = Usuario.objects.filter(
            is_active=True,
            rol__nombre__in=['ADMINISTRADOR', 'RECEPCION'],
        )
        for coordinador in coordinadores:
            notificar(coordinador.id, f'Validar reposición Hab. {item.habitacion.numero}', mensaje)

        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=['post'])
    def validar_reposicion(self, request, pk=None):
        """
        Valida definitivamente la reposición de un ítem (ADMINISTRADOR / RECEPCION).
        Pasa el estado a COMPLETO y notifica al operario y a coordinación.
        """
        item = self.get_object()
        if item.estado != 'PENDIENTE_VALIDACION':
            return Response(
                {'detail': 'El artículo no tiene una reposición pendiente de validación.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.estado = 'COMPLETO'
        item.cantidad_actual = item.cantidad_esperada
        item.notas = ''
        item.save()

        validador = f'{getattr(request.user, "nombre", "")} {getattr(request.user, "apellido", "")}'.strip() or 'Coordinación'
        quien_repuso = (
            f'{getattr(item.repuesto_por, "nombre", "")} {getattr(item.repuesto_por, "apellido", "")}'.strip()
            if item.repuesto_por else 'la encargada'
        )
        mensaje = (
            f'{validador} validó la reposición de "{item.nombre}" en la habitación {item.habitacion.numero} '
            f'(repuesto por {quien_repuso}). Dotación completa.'
        )
        coordinadores = Usuario.objects.filter(
            is_active=True,
            rol__nombre__in=['ADMINISTRADOR', 'RECEPCION'],
        )
        for coordinador in coordinadores:
            notificar(coordinador.id, f'Reposición validada Hab. {item.habitacion.numero}', mensaje)

        if item.habitacion.asignada_a_id:
            notificar(
                item.habitacion.asignada_a_id,
                f'Reposición validada Hab. {item.habitacion.numero}',
                f'Se validó la reposición de "{item.nombre}" en tu habitación {item.habitacion.numero}. Dotación completa.',
            )

        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=['post'])
    def solicitar(self, request, pk=None):
        """Alias retrocompatible de reportar_faltante."""
        return self.reportar_faltante(request, pk=pk)

    @action(detail=True, methods=['post'])
    def reponer(self, request, pk=None):
        """Alias retrocompatible de marcar_repuesto."""
        return self.marcar_repuesto(request, pk=pk)
