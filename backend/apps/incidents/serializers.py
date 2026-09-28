"""
Serializadores de incidencias — Grupo Norus.

Contrato de API (según las pantallas del frontend):
- FKs anidadas en lectura: habitacion → {id, numero};
  reportado_por → {id, nombre, apellido, rut}.
- `reportada_por` se expone como ALIAS de `reportado_por`
  (IncidenciaDetailScreen usa userLabel(inc.reportada_por)).
- `reportado_por` no se acepta en el payload: el backend lo asigna
  automáticamente al usuario autenticado.
"""
from rest_framework import serializers

from apps.core.fields import NestedPKRelatedField
from apps.rooms.models import Habitacion
from apps.rooms.serializers import HabitacionMiniSerializer
from apps.users.serializers import UsuarioMiniSerializer

from .models import Incidencia


class IncidenciaMiniSerializer(serializers.ModelSerializer):
    """Versión mínima para anidar en evidencias: {id, titulo, severidad}."""

    class Meta:
        model = Incidencia
        fields = ['id', 'titulo', 'severidad']


class IncidenciaSerializer(serializers.ModelSerializer):
    habitacion = NestedPKRelatedField(
        queryset=Habitacion.objects.all(),
        serializer_class=HabitacionMiniSerializer,
        required=False,
        allow_null=True,
    )
    reportado_por = UsuarioMiniSerializer(read_only=True)
    reportada_por = serializers.SerializerMethodField()

    class Meta:
        model = Incidencia
        fields = [
            'id', 'titulo', 'descripcion', 'habitacion', 'severidad',
            'reportado_por', 'reportada_por', 'requiere_evidencia',
            'creada_en', 'atendida_en', 'resuelta_en',
        ]
        read_only_fields = ['creada_en', 'atendida_en', 'resuelta_en']

    def get_reportada_por(self, obj):
        """Alias de reportado_por (compatibilidad con el frontend)."""
        return UsuarioMiniSerializer(obj.reportado_por, context=self.context).data
