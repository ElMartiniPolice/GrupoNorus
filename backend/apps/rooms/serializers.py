"""
Serializadores de habitaciones y estadías — Grupo Norus.

Contrato de API (según las pantallas del frontend):
- Las FK se LEEN como objetos anidados ({id, numero} / {id, nombre})
  y se ESCRIBEN como IDs planos.
"""
from django.db import models
from rest_framework import serializers

from apps.core.fields import NestedPKRelatedField
from apps.users.models import Usuario
from apps.users.serializers import UsuarioMiniSerializer
from .models import (
    CambioEstadoHabitacion,
    Habitacion,
    ItemInventario,
    PlantillaInventario,
    RegistroEstadia,
    TipoHabitacion,
)


class TipoHabitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoHabitacion
        fields = ['id', 'nombre']


class HabitacionMiniSerializer(serializers.ModelSerializer):
    """Versión mínima para anidar en tareas/incidencias: {id, numero}."""

    class Meta:
        model = Habitacion
        fields = ['id', 'numero']


class HabitacionSerializer(serializers.ModelSerializer):
    tipo = NestedPKRelatedField(
        queryset=TipoHabitacion.objects.all(),
        serializer_class=TipoHabitacionSerializer,
    )
    asignada_a = NestedPKRelatedField(
        queryset=Usuario.objects.filter(
            is_active=True,
            rol__nombre='OPERARIO',
            area__nombre__iexact='HOUSEKEEPING',
        ),
        serializer_class=UsuarioMiniSerializer,
        required=False,
        allow_null=True,
    )
    items_faltantes_count = serializers.SerializerMethodField()

    class Meta:
        model = Habitacion
        fields = [
            'id', 'numero', 'tipo', 'estado', 'asignada_a',
            'items_faltantes_count',
        ]

    def get_items_faltantes_count(self, obj):
        return obj.inventario.filter(
            models.Q(estado__in=['SOLICITADO', 'FALTANTE', 'PENDIENTE_VALIDACION'])
            | models.Q(cantidad_actual__lt=models.F('cantidad_esperada'))
        ).count()


class RegistroEstadiaSerializer(serializers.ModelSerializer):
    habitacion = NestedPKRelatedField(
        queryset=Habitacion.objects.all(),
        serializer_class=HabitacionMiniSerializer,
    )
    salida_prevista = serializers.DateField(read_only=True)
    conflicto = serializers.BooleanField(read_only=True)
    registrado_por = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = RegistroEstadia
        fields = [
            'id', 'habitacion', 'huesped', 'llegada', 'salida',
            'salida_prevista', 'conflicto', 'registrado_por',
        ]


class CambioEstadoHabitacionSerializer(serializers.ModelSerializer):
    """
    Cambio de estado de una habitación (historial con foto opcional).

    - `habitacion` y `cambiado_por` se LEEN anidados; el registro se
      crea desde la acción `cambiar_estado` (no por POST directo).
    - `foto` (ImageField) se lee como URL absoluta gracias al
      `context={'request': request}` de la vista.
    """
    habitacion = HabitacionMiniSerializer(read_only=True)
    cambiado_por = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = CambioEstadoHabitacion
        fields = [
            'id', 'habitacion', 'estado_anterior', 'estado_nuevo',
            'foto', 'cambiado_por', 'fecha',
        ]


class PlantillaInventarioSerializer(serializers.ModelSerializer):
    tipo_habitacion = NestedPKRelatedField(
        queryset=TipoHabitacion.objects.all(),
        serializer_class=TipoHabitacionSerializer,
    )

    class Meta:
        model = PlantillaInventario
        fields = ['id', 'tipo_habitacion', 'nombre', 'categoria', 'cantidad']


class ItemInventarioSerializer(serializers.ModelSerializer):
    habitacion = NestedPKRelatedField(
        queryset=Habitacion.objects.all(),
        serializer_class=HabitacionMiniSerializer,
    )
    solicitado_por = UsuarioMiniSerializer(read_only=True)
    repuesto_por = UsuarioMiniSerializer(read_only=True)
    cantidad_faltante = serializers.SerializerMethodField()

    class Meta:
        model = ItemInventario
        fields = [
            'id', 'habitacion', 'nombre', 'categoria', 'cantidad',
            'cantidad_esperada', 'cantidad_actual', 'cantidad_faltante',
            'estado', 'notas', 'solicitado_en', 'solicitado_por',
            'repuesto_en', 'repuesto_por',
            'actualizado_en',
        ]

    def get_cantidad_faltante(self, obj):
        esperada = obj.cantidad_esperada or obj.cantidad or 0
        actual = obj.cantidad_actual if obj.cantidad_actual is not None else esperada
        return max(0, esperada - actual)

