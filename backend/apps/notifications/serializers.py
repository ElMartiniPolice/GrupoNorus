"""Serializadores de notificaciones — Grupo Norus."""
from rest_framework import serializers

from apps.users.serializers import UsuarioMiniSerializer

from .models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    usuario = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = Notificacion
        fields = ['id', 'usuario', 'titulo', 'mensaje', 'leida', 'creada_en']
        read_only_fields = ['creada_en']
