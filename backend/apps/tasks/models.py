"""
Modelos de tareas — Grupo Norus.

CU2: asignación de tareas (ADMINISTRADOR / RECEPCION).
CU5: consulta de tareas asignadas (OPERARIO).
CU6: actualización de estado de una tarea.
CU9: validación de tareas completadas (ADMINISTRADOR).
"""
from django.conf import settings
from django.db import models

from apps.rooms.models import Habitacion

PRIORIDADES_TAREA = [
    ('CRITICA', 'Crítica'),
    ('ALTA', 'Alta'),
    ('MEDIA', 'Media'),
    ('BAJA', 'Baja'),
]

ESTADOS_TAREA = [
    ('PENDIENTE', 'Pendiente'),
    ('EN_PROGRESO', 'En progreso'),
    ('COMPLETADA', 'Completada'),
    ('CANCELADA', 'Cancelada'),
]


class AsignacionTarea(models.Model):
    """Tarea asignada a un operario sobre una habitación (CU2/CU5/CU6/CU9)."""
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    habitacion = models.ForeignKey(
        Habitacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tareas',
    )
    asignado_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tareas',
    )
    prioridad = models.CharField(
        max_length=20,
        choices=PRIORIDADES_TAREA,
        default='MEDIA',
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_TAREA,
        default='PENDIENTE',
    )
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'asignacion_tarea'
        ordering = ['-creada_en']
        verbose_name = 'asignación de tarea'
        verbose_name_plural = 'asignaciones de tareas'

    def __str__(self):
        return f'{self.titulo} · {self.get_estado_display()}'


class HistorialEstadoTarea(models.Model):
    """Bitácora de cambios de estado de una tarea (CU6/CU9)."""
    tarea = models.ForeignKey(
        AsignacionTarea,
        on_delete=models.CASCADE,
        related_name='historial',
    )
    estado_nuevo = models.CharField(max_length=20, choices=ESTADOS_TAREA)
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cambios_estado_tarea',
    )

    class Meta:
        db_table = 'historial_estado_tarea'
        ordering = ['-fecha']
        verbose_name = 'historial de estado de tarea'
        verbose_name_plural = 'historiales de estado de tareas'

    def __str__(self):
        return f'Tarea {self.tarea_id} → {self.estado_nuevo}'
