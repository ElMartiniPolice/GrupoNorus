"""Administración de privacidad — Grupo Norus."""

from django.contrib import admin

from .models import AvisoPrivacidad, Consentimiento, RegistroAuditoria, SolicitudDerechos


@admin.register(AvisoPrivacidad)
class AvisoPrivacidadAdmin(admin.ModelAdmin):
    list_display = ['version', 'titulo', 'vigente_desde', 'activo', 'creado_en']
    list_filter = ['activo']
    search_fields = ['version', 'titulo', 'contenido']


@admin.register(Consentimiento)
class ConsentimientoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'aviso', 'aceptado_en', 'retirado_en', 'activo']
    list_filter = ['activo', 'aviso']
    search_fields = ['usuario__rut', 'usuario__nombre', 'usuario__apellido']
    raw_id_fields = ['usuario']


@admin.register(SolicitudDerechos)
class SolicitudDerechosAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'tipo', 'estado', 'creada_en', 'resuelta_en']
    list_filter = ['tipo', 'estado']
    search_fields = ['usuario__rut', 'usuario__nombre', 'usuario__apellido', 'detalle']
    raw_id_fields = ['usuario', 'resuelta_por']


@admin.register(RegistroAuditoria)
class RegistroAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['accion', 'usuario', 'recurso', 'ip', 'creado_en']
    list_filter = ['accion']
    search_fields = ['accion', 'recurso', 'usuario__rut', 'usuario__nombre']
    raw_id_fields = ['usuario']
