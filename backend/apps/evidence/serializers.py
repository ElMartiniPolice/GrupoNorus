"""
Serializadores de evidencias — Grupo Norus.

Contrato de API (evidenciaService / IncidenciaDetailScreen):
- `incidencia` se ESCRIBE como ID plano (llega como String en el
  multipart) y se LEE como objeto anidado {id, titulo, severidad}.
- `imagen` se LEE como URL (string) — evidenciaUri tolera string
  directa, {url} o {image}.
"""
from rest_framework import serializers

from apps.core.fields import NestedPKRelatedField
from apps.incidents.models import Incidencia
from apps.incidents.serializers import IncidenciaMiniSerializer
from apps.rooms.models import Habitacion
from apps.rooms.serializers import HabitacionMiniSerializer
from apps.tasks.models import AsignacionTarea
from apps.users.serializers import UsuarioMiniSerializer

from .models import EvidenciaFotografica, ObjetoEncontrado


class AsignacionTareaMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsignacionTarea
        fields = ['id', 'titulo', 'prioridad', 'estado']


class EvidenciaFotograficaSerializer(serializers.ModelSerializer):
    incidencia = NestedPKRelatedField(
        queryset=Incidencia.objects.all(),
        serializer_class=IncidenciaMiniSerializer,
        required=False,
        allow_null=True,
    )
    tarea = NestedPKRelatedField(
        queryset=AsignacionTarea.objects.all(),
        serializer_class=AsignacionTareaMiniSerializer,
        required=False,
        allow_null=True,
    )
    subida_por = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = EvidenciaFotografica
        fields = [
            'id', 'incidencia', 'tarea', 'imagen', 'subida_por',
            'subida_en', 'creada_en',
        ]
        read_only_fields = ['subida_en', 'creada_en']

    def validate(self, attrs):
        incidencia = attrs.get('incidencia')
        tarea = attrs.get('tarea')
        if not incidencia and not tarea:
            raise serializers.ValidationError(
                'Debe asociar la evidencia a una incidencia o a una tarea.'
            )
        return attrs


class ObjetoEncontradoSerializer(serializers.ModelSerializer):
    encontrado_por = UsuarioMiniSerializer(read_only=True)
    habitacion = NestedPKRelatedField(
        queryset=Habitacion.objects.all(),
        serializer_class=HabitacionMiniSerializer,
        required=True,
        allow_null=True,
    )
    ubicacion = serializers.CharField(read_only=True)

    class Meta:
        model = ObjetoEncontrado
        fields = [
            'id', 'nombre', 'descripcion', 'ubicacion', 'habitacion', 'imagen',
            'encontrado_por', 'creado_en',
        ]
        read_only_fields = ['encontrado_por', 'creado_en']

    def validate_habitacion(self, value):
        if value is None:
            raise serializers.ValidationError('Seleccione la habitación donde se encontró el objeto.')
        return value
