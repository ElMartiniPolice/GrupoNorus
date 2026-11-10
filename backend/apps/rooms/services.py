"""
Servicios de habitaciones — Grupo Norus.

CP-DP-02: los OPERARIOS solo acceden a "sus" habitaciones y al
registro fotográfico de cada una.
"""
from django.db.models import Q

from apps.notifications.services import notificar
from .models import Habitacion, ItemInventario, PlantillaInventario


def habitaciones_del_operario(user):
    """
    Habitaciones vinculadas a un OPERARIO: aquellas donde tiene tareas
    asignadas o donde reportó una incidencia.

    El llamador debe verificar el rol con `is_operario(user)`.
    """
    if not (user and user.is_authenticated):
        return Habitacion.objects.none()
    return Habitacion.objects.filter(
        Q(asignada_a=user)
        | Q(tareas__asignado_a=user)
        | Q(incidencias__reportado_por=user),
    ).distinct()


def aplicar_plantilla_a_habitacion(habitacion, sobrescribir_cantidades=False, notificar_operario=True):
    """
    Aplica la plantilla estándar correspondiente al tipo de la habitación.
    Crea los artículos faltantes y, opcionalmente, actualiza las cantidades esperadas.
    Notifica al operario de housekeeping asignado si existe.
    Retorna una tupla (creados_count, actualizados_count).
    """
    if not habitacion or not habitacion.tipo_id:
        return 0, 0

    plantillas = PlantillaInventario.objects.filter(tipo_habitacion=habitacion.tipo)
    if not plantillas.exists():
        return 0, 0

    creados = 0
    actualizados = 0

    for p in plantillas:
        item = ItemInventario.objects.filter(
            habitacion=habitacion,
            nombre__iexact=p.nombre,
        ).first()

        if item:
            if sobrescribir_cantidades:
                item.cantidad_esperada = p.cantidad
                item.cantidad = p.cantidad
                item.categoria = p.categoria
                if item.cantidad_actual > p.cantidad:
                    item.cantidad_actual = p.cantidad
                item.save()
                actualizados += 1
        else:
            ItemInventario.objects.create(
                habitacion=habitacion,
                nombre=p.nombre,
                categoria=p.categoria,
                cantidad=p.cantidad,
                cantidad_esperada=p.cantidad,
                cantidad_actual=p.cantidad,
                estado='COMPLETO',
            )
            creados += 1

    if notificar_operario and habitacion.asignada_a_id:
        notificar(
            usuario_id=habitacion.asignada_a_id,
            titulo=f'Inventario Hab. {habitacion.numero}',
            mensaje=(
                f'Se ha aplicado la dotación estándar de inventario para la '
                f'habitación {habitacion.numero}. Revisa los artículos a tu cargo.'
            ),
        )

    return creados, actualizados
