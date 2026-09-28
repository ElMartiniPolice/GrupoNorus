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
from apps.users.serializers import UsuarioMiniSerializer

from .models import EvidenciaFotografica


class EvidenciaFotograficaSerializer(serializers.ModelSerializer):
    incidencia = NestedPKRelatedField(
        queryset=Incidencia.objects.all(),
        serializer_class=IncidenciaMiniSerializer,
    )
    subida_por = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = EvidenciaFotografica
        fields = [
            'id', 'incidencia', 'imagen', 'subida_por',
            'subida_en', 'creada_en',
        ]
        read_only_fields = ['subida_en', 'creada_en']
