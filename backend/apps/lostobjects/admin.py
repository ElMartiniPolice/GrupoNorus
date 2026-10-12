from django.contrib import admin

from .models import ObjetoPerdido


@admin.register(ObjetoPerdido)
class ObjetoPerdidoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'categoria', 'sede', 'habitacion', 'estado', 'reportado_por', 'encontrado_en')
    list_filter = ('estado', 'categoria', 'sede')
    search_fields = ('titulo', 'descripcion', 'ubicacion', 'entregado_a')
    readonly_fields = ('encontrado_en', 'entregado_en')
