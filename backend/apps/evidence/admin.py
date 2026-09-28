"""Admin de evidencias — Grupo Norus."""
from django.contrib import admin

from .models import EvidenciaFotografica


@admin.register(EvidenciaFotografica)
class EvidenciaFotograficaAdmin(admin.ModelAdmin):
    list_display = ['id', 'incidencia', 'subida_por', 'creada_en']
    list_filter = ['creada_en']
    search_fields = ['incidencia__titulo']
    raw_id_fields = ['incidencia', 'subida_por']
