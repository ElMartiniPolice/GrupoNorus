"""
Admin de tareas — Grupo Norus.
"""
from django.contrib import admin

from .models import AsignacionTarea, HistorialEstadoTarea


class HistorialEstadoTareaInline(admin.TabularInline):
    model = HistorialEstadoTarea
    extra = 0


@admin.register(AsignacionTarea)
class AsignacionTareaAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'habitacion', 'asignado_a', 'prioridad', 'estado', 'creada_en')
    list_filter = ('estado', 'prioridad')
    search_fields = ('titulo', 'descripcion')
    inlines = [HistorialEstadoTareaInline]


@admin.register(HistorialEstadoTarea)
class HistorialEstadoTareaAdmin(admin.ModelAdmin):
    list_display = ('id', 'tarea', 'estado_nuevo', 'fecha', 'usuario')
    list_filter = ('estado_nuevo',)
