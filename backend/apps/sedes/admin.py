from django.contrib import admin

from .models import Sede


@admin.register(Sede)
class SedeAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'direccion', 'activo', 'creado_en')
    list_filter = ('activo',)
    search_fields = ('nombre', 'direccion')
