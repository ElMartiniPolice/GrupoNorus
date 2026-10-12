"""Serializadores de notificaciones — Grupo Norus."""
from rest_framework import serializers

from apps.users.serializers import UsuarioMiniSerializer
from apps.sedes.serializers import SedeMiniSerializer

from .models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    usuario = UsuarioMiniSerializer(read_only=True)
    sede = SedeMiniSerializer(read_only=True)

    class Meta:
        model = Notificacion
        fields = ['id', 'usuario', 'sede', 'titulo', 'mensaje', 'leida', 'creada_en']
        read_only_fields = ['creada_en']
