"""
Admin de habitaciones y estadías — Grupo Norus.
"""
from django.contrib import admin

from .models import Habitacion, ItemInventario, PlantillaInventario, RegistroEstadia, TipoHabitacion


@admin.register(TipoHabitacion)
class TipoHabitacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')
    search_fields = ('nombre',)


@admin.register(PlantillaInventario)
class PlantillaInventarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'tipo_habitacion', 'nombre', 'categoria', 'cantidad')
    list_filter = ('tipo_habitacion', 'categoria')
    search_fields = ('nombre', 'tipo_habitacion__nombre')


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
    list_display = (
        'id', 'habitacion', 'nombre', 'categoria',
        'cantidad_actual', 'cantidad_esperada', 'estado',
        'solicitado_por', 'solicitado_en',
    )
    list_filter = ('estado', 'categoria', 'habitacion')
    search_fields = ('nombre', 'habitacion__numero')

