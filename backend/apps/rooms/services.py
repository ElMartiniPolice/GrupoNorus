"""
Servicios de habitaciones — Grupo Norus.

CP-DP-02: los OPERARIOS solo acceden a "sus" habitaciones y al
registro fotográfico de cada una.
"""
from django.db.models import Q

from .models import Habitacion


def habitaciones_del_operario(user):
    """
    Habitaciones vinculadas a un OPERARIO: aquellas donde tiene tareas
    asignadas o donde reportó una incidencia.

    El llamador debe verificar el rol con `is_operario(user)`.
    """
    if not (user and user.is_authenticated):
        return Habitacion.objects.none()
    return Habitacion.objects.filter(
        Q(tareas__asignado_a=user) | Q(incidencias__reportado_por=user),
    ).distinct()
