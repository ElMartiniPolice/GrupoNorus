"""Admin de notificaciones — Grupo Norus."""
from django.contrib import admin

from .models import Notificacion


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'titulo', 'leida', 'creada_en']
    list_filter = ['leida', 'creada_en']
    search_fields = ['titulo', 'usuario__nombre', 'usuario__rut']
    raw_id_fields = ['usuario']
