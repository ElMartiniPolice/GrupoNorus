from django.contrib import admin

from .models import InventarioItem


@admin.register(InventarioItem)
class InventarioItemAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'sede', 'habitacion', 'cantidad', 'stock_minimo', 'actualizado_en')
    list_filter = ('categoria', 'sede')
    search_fields = ('nombre', 'notas')
    readonly_fields = ('actualizado_en', 'creado_en')
