"""
Serializadores de habitaciones y estadías — Grupo Norus.

Contrato de API (según las pantallas del frontend):
- Las FK se LEEN como objetos anidados ({id, numero} / {id, nombre})
  y se ESCRIBEN como IDs planos.
"""
from rest_framework import serializers

from apps.core.fields import NestedPKRelatedField
from apps.users.serializers import UsuarioMiniSerializer
from .models import (
    CambioEstadoHabitacion,
    Habitacion,
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

    class Meta:
        model = Habitacion
        fields = ['id', 'numero', 'tipo', 'estado']


class RegistroEstadiaSerializer(serializers.ModelSerializer):
    habitacion = NestedPKRelatedField(
        queryset=Habitacion.objects.all(),
        serializer_class=HabitacionMiniSerializer,
    )
    salida_prevista = serializers.DateField(read_only=True)
    conflicto = serializers.BooleanField(read_only=True)

    class Meta:
        model = RegistroEstadia
        fields = [
            'id', 'habitacion', 'huesped', 'llegada', 'salida',
            'salida_prevista', 'conflicto',
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
