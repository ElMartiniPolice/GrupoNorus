from rest_framework import serializers

from apps.core.fields import NestedPKRelatedField
from apps.rooms.models import Habitacion
from apps.rooms.serializers import HabitacionMiniSerializer
from apps.sedes.models import Sede
from apps.sedes.serializers import SedeMiniSerializer
from apps.users.serializers import UsuarioMiniSerializer

from .models import InventarioItem


class InventarioItemSerializer(serializers.ModelSerializer):
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
    actualizado_por = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = InventarioItem
        fields = [
            'id', 'nombre', 'categoria', 'sede', 'habitacion', 'cantidad',
            'stock_minimo', 'notas', 'actualizado_por', 'actualizado_en', 'creado_en',
        ]
        read_only_fields = ['actualizado_en', 'creado_en']

    def validate_cantidad(self, value):
        if value < 0:
            raise serializers.ValidationError('La cantidad no puede ser negativa.')
        return value

    def validate_stock_minimo(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock mínimo no puede ser negativo.')
        return value


class InventarioItemMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventarioItem
        fields = ['id', 'nombre', 'cantidad']
