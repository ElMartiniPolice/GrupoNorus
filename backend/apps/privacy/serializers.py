"""Serializadores de privacidad — Grupo Norus.

Ley N° 21.719: aviso de privacidad versionado, consentimiento con
timestamp y versión, solicitudes de derechos del titular y bitácora
de auditoría de accesos a datos personales.
"""

from rest_framework import serializers

from apps.users.serializers import UsuarioMiniSerializer

from .models import AvisoPrivacidad, Consentimiento, RegistroAuditoria, SolicitudDerechos


class AvisoPrivacidadSerializer(serializers.ModelSerializer):
    """Aviso de privacidad (público, se muestra en el login)."""

    class Meta:
        model = AvisoPrivacidad
        fields = ['id', 'version', 'titulo', 'contenido', 'vigente_desde', 'activo', 'creado_en']
        read_only_fields = ['creado_en']


class ConsentimientoSerializer(serializers.ModelSerializer):
    """Constancia de consentimiento: quién, qué versión y cuándo."""

    usuario = UsuarioMiniSerializer(read_only=True)
    aviso_version = serializers.CharField(source='aviso.version', read_only=True)

    class Meta:
        model = Consentimiento
        fields = [
            'id', 'usuario', 'aviso', 'aviso_version',
            'aceptado_en', 'retirado_en', 'activo',
        ]
        read_only_fields = ['aviso', 'aceptado_en', 'retirado_en', 'activo']


class SolicitudDerechosSerializer(serializers.ModelSerializer):
    """Solicitud de ejercicio de derechos del titular (creación y lectura)."""

    usuario = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = SolicitudDerechos
        fields = [
            'id', 'usuario', 'tipo', 'detalle',
            'estado', 'respuesta', 'creada_en', 'resuelta_en',
        ]
        read_only_fields = ['estado', 'respuesta', 'creada_en', 'resuelta_en']


class SolicitudDerechosAdminSerializer(serializers.ModelSerializer):
    """Escritura administrativa: permite actualizar estado y respuesta."""

    usuario = UsuarioMiniSerializer(read_only=True)
    resuelta_por = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = SolicitudDerechos
        fields = [
            'id', 'usuario', 'tipo', 'detalle', 'estado', 'respuesta',
            'creada_en', 'resuelta_en', 'resuelta_por',
        ]
        read_only_fields = ['creada_en', 'resuelta_en', 'resuelta_por']


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    """Bitácora de auditoría de accesos a datos personales."""

    usuario = UsuarioMiniSerializer(read_only=True)

    class Meta:
        model = RegistroAuditoria
        fields = ['id', 'usuario', 'accion', 'recurso', 'detalle', 'ip', 'creado_en']
