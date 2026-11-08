"""
Admin de habitaciones y estadías — Grupo Norus.
"""
from django.contrib import admin

from .models import Habitacion, ItemInventario, RegistroEstadia, TipoHabitacion


@admin.register(TipoHabitacion)
class TipoHabitacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')
    search_fields = ('nombre',)


@admin.register(Habitacion)
class HabitacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'numero', 'tipo', 'estado')
    list_filter = ('estado', 'tipo')
    search_fields = ('numero',)


@admin.register(RegistroEstadia)
class RegistroEstadiaAdmin(admin.ModelAdmin):
    list_display = ('id', 'habitacion', 'huesped', 'llegada', 'salida', 'conflicto')
    list_filter = ('conflicto',)
    search_fields = ('huesped',)


@admin.register(ItemInventario)
class ItemInventarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'habitacion', 'nombre', 'categoria', 'cantidad', 'estado', 'solicitado_por', 'solicitado_en')
    list_filter = ('estado', 'categoria', 'habitacion')
    search_fields = ('nombre', 'habitacion__numero')

