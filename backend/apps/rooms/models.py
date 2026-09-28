"""
Modelos de habitaciones y estadías — Grupo Norus.

CU1: check-in / check-out de huéspedes.
CU3: check-in (la habitación pasa a OCUPADA).
CU10: monitoreo de habitaciones y detección de conflictos de estadía.
CP-HAB-01: gestión de habitaciones.
"""
from django.db import models

from apps.users.models import Usuario

ESTADOS_HABITACION = [
    ('DISPONIBLE', 'Disponible'),
    ('OCUPADA', 'Ocupada'),
    ('LIMPIEZA', 'Limpieza'),
    ('MANTENCION', 'Mantención'),
]


class TipoHabitacion(models.Model):
    """Catálogo de tipos de habitación (Simple, Doble, Suite, ...)."""
    nombre = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'tipo_habitacion'
        ordering = ['nombre']
        verbose_name = 'tipo de habitación'
        verbose_name_plural = 'tipos de habitación'

    def __str__(self):
        return self.nombre


class Habitacion(models.Model):
    """Habitación del apart-hotel (CU1/CU3/CU10, CP-HAB-01)."""
    numero = models.CharField(max_length=10, unique=True)
    tipo = models.ForeignKey(
        TipoHabitacion,
        on_delete=models.PROTECT,
        related_name='habitaciones',
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_HABITACION,
        default='DISPONIBLE',
    )

    class Meta:
        db_table = 'habitacion'
        ordering = ['numero']
        verbose_name = 'habitación'
        verbose_name_plural = 'habitaciones'

    def __str__(self):
        return f'{self.numero} ({self.estado})'


class RegistroEstadia(models.Model):
    """
    Registro de estadía de un huésped (CU1/CU3/CU10).

    - `salida` en NULL significa que la estadía está ACTIVA
      (el frontend detecta la estadía activa con `!estadia.salida`).
    - `salida_prevista` guarda la fecha de salida planificada que envía
      el frontend al crear el check-in (no cierra la estadía).
    - `conflicto` marca estadías duplicadas sobre la misma habitación
      (dos huéspedes activos a la vez) — alimenta el KPI3.
    """
    habitacion = models.ForeignKey(
        Habitacion,
        on_delete=models.CASCADE,
        related_name='estadias',
    )
    huesped = models.CharField(max_length=150)
    llegada = models.DateField()
    salida = models.DateField(null=True, blank=True)
    salida_prevista = models.DateField(null=True, blank=True)
    conflicto = models.BooleanField(default=False)

    class Meta:
        db_table = 'registro_estadia'
        ordering = ['-llegada']
        verbose_name = 'registro de estadía'
        verbose_name_plural = 'registros de estadía'

    def __str__(self):
        return f'{self.huesped} · Hab. {self.habitacion_id}'


class CambioEstadoHabitacion(models.Model):
    """
    Historial de cambios de estado de una habitación (CU10 / CP-DP-02).

    Cada vez que se cambia el estado de una habitación se registra el
    estado anterior, el nuevo, quién lo hizo y una fotografía opcional
    (los operarios adjuntan fotos al terminar la limpieza/mantención).
    """
    habitacion = models.ForeignKey(
        Habitacion,
        on_delete=models.CASCADE,
        related_name='cambios_estado',
    )
    estado_anterior = models.CharField(
        max_length=20,
        choices=ESTADOS_HABITACION,
    )
    estado_nuevo = models.CharField(
        max_length=20,
        choices=ESTADOS_HABITACION,
    )
    foto = models.ImageField(upload_to='cambios_estado/', blank=True, null=True)
    cambiado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cambios_estado',
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cambio_estado_habitacion'
        ordering = ['-fecha']
        verbose_name = 'cambio de estado de habitación'
        verbose_name_plural = 'cambios de estado de habitación'

    def __str__(self):
        return (
            f'Hab. {self.habitacion_id}: '
            f'{self.estado_anterior} → {self.estado_nuevo}'
        )
