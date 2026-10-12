from rest_framework import serializers

from apps.core.fields import NestedPKRelatedField
from apps.core.uploads import validar_imagen
from apps.rooms.models import Habitacion
from apps.rooms.serializers import HabitacionMiniSerializer
from apps.sedes.models import Sede
from apps.sedes.serializers import SedeMiniSerializer
from apps.users.serializers import UsuarioMiniSerializer

from .models import ObjetoPerdido


class ObjetoPerdidoSerializer(serializers.ModelSerializer):
    sede = NestedPKRelatedField(
        queryset=Sede.objects.all(),
        serializer_class=SedeMiniSerializer,
        required=False,
        allow_null=True,
    )
    habitacion = NestedPKRelatedField(
        queryset=Habitacion.objects.all(),
        serializer_class=HabitacionMiniSerializer,
        required=False,
        allow_null=True,
    )
    reportado_por = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = ObjetoPerdido
        fields = [
            'id', 'titulo', 'descripcion', 'categoria', 'sede', 'habitacion',
            'ubicacion', 'estado', 'imagen', 'reportado_por', 'entregado_a',
            'encontrado_en', 'entregado_en',
        ]
        read_only_fields = ['encontrado_en', 'entregado_en']

    def validate_imagen(self, value):
        validar_imagen(value)
        return value


class ObjetoPerdidoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetoPerdido
        fields = ['id', 'titulo', 'estado']
