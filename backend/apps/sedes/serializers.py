from rest_framework import serializers

from .models import Sede


class SedeMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['id', 'nombre']


class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['id', 'nombre', 'direccion', 'activo', 'creado_en']
        read_only_fields = ['creado_en']
