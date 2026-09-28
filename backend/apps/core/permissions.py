"""
Permisos por rol y área — Grupo Norus.

Roles: ADMINISTRADOR, OPERARIO, RECEPCION
Áreas: RECEPCION, MANTENCION, HOUSEKEEPING

Implementa el control de acceso basado en roles del caso CP-DP-02:
cada usuario solo accede a la información de su área operativa.
"""
from rest_framework.permissions import BasePermission

# ------------------------- Helpers de rol -------------------------


def is_admin(user):
    return bool(user and user.is_authenticated and user.rol and user.rol.nombre == 'ADMINISTRADOR')


def is_recepcion(user):
    return bool(user and user.is_authenticated and user.rol and user.rol.nombre == 'RECEPCION')


def is_operario(user):
    return bool(user and user.is_authenticated and user.rol and user.rol.nombre == 'OPERARIO')


# ------------------------- Permisos -------------------------


class IsAdmin(BasePermission):
    """Solo administradores (gestión de usuarios, KPIs, configuración)."""

    message = 'Se requiere rol ADMINISTRADOR.'

    def has_permission(self, request, view):
        return is_admin(request.user)


class IsRecepcion(BasePermission):
    """Personal de recepción (check-in, check-out, monitoreo)."""

    message = 'Se requiere rol RECEPCION.'

    def has_permission(self, request, view):
        return is_recepcion(request.user)


class IsAdminOrRecepcion(BasePermission):
    """Administradores o recepción (asignación de tareas y habitaciones)."""

    message = 'Se requiere rol ADMINISTRADOR o RECEPCION.'

    def has_permission(self, request, view):
        return is_admin(request.user) or is_recepcion(request.user)


class IsOwnerOrAdmin(BasePermission):
    """
    CP-DP-02: el operario solo ve/modifica sus propias tareas e incidencias;
    el administrador accede a todo.
    """

    message = 'No tiene permiso sobre este recurso.'

    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        asignado = getattr(obj, 'asignado_a', None) or getattr(obj, 'reportado_por', None)
        return asignado == request.user


class SameAreaOrAdmin(BasePermission):
    """El usuario solo accede a recursos de su propia área (salvo admin)."""

    message = 'No tiene permiso sobre recursos de otra área.'

    def has_object_permission(self, request, view, obj):
        if is_admin(request.user):
            return True
        user_area = getattr(request.user, 'area', None)
        obj_area = getattr(obj, 'area', None)
        return user_area is not None and obj_area is not None and user_area == obj_area
