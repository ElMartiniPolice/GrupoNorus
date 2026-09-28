"""
Admin de incidencias — Grupo Norus.
"""
from django.contrib import admin

from .models import Incidencia


@admin.register(Incidencia)
class IncidenciaAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'titulo', 'habitacion', 'severidad', 'reportado_por',
        'requiere_evidencia', 'creada_en', 'atendida_en', 'resuelta_en',
    )
    list_filter = ('severidad', 'requiere_evidencia')
    search_fields = ('titulo', 'descripcion')
