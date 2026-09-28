"""
Serializadores de tareas — Grupo Norus.

Contrato de API (según las pantallas del frontend):
- FKs anidadas en lectura: habitacion → {id, numero};
  asignado_a → {id, nombre, apellido, rut}.
- Escritura con IDs planos (ChipSelect keyBy="id").
- Historial con campos canónicos: estado_nuevo, fecha, usuario.
"""
from rest_framework import serializers

from apps.core.fields import NestedPKRelatedField
from apps.rooms.models import Habitacion
from apps.rooms.serializers import HabitacionMiniSerializer
from apps.users.models import Usuario
from apps.users.serializers import UsuarioMiniSerializer

from .models import AsignacionTarea, HistorialEstadoTarea


class AsignacionTareaSerializer(serializers.ModelSerializer):
    habitacion = NestedPKRelatedField(
        queryset=Habitacion.objects.all(),
        serializer_class=HabitacionMiniSerializer,
        required=False,
        allow_null=True,
    )
    asignado_a = NestedPKRelatedField(
        queryset=Usuario.objects.all(),
        serializer_class=UsuarioMiniSerializer,
    )

    class Meta:
        model = AsignacionTarea
        fields = [
            'id', 'titulo', 'descripcion', 'habitacion', 'asignado_a',
            'prioridad', 'estado', 'creada_en',
        ]
        read_only_fields = ['creada_en']


class HistorialEstadoTareaSerializer(serializers.ModelSerializer):
    usuario = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = HistorialEstadoTarea
        fields = ['estado_nuevo', 'fecha', 'usuario']
