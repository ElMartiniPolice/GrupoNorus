"""Registro de modelos en el admin de Django."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.users.models import Area, Rol, Usuario


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    list_display = ('rut', 'nombre', 'apellido', 'rol', 'area', 'is_active', 'ultimo_acceso')
    list_filter = ('rol', 'area', 'is_active')
    search_fields = ('rut', 'nombre', 'apellido')
    ordering = ('rut',)
    fieldsets = (
        (None, {'fields': ('rut', 'password')}),
        ('Datos personales', {'fields': ('nombre', 'apellido', 'telefono')}),
        ('Rol y área', {'fields': ('rol', 'area')}),
        ('Seguridad', {'fields': ('intentos_fallidos', 'bloqueado_hasta', 'ultimo_acceso')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('rut', 'nombre', 'apellido', 'rol', 'area', 'password1', 'password2'),
        }),
    )
    filter_horizontal = ('groups', 'user_permissions')
