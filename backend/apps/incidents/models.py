"""
Modelos de incidencias — Grupo Norus.

CU8: reporte y gestión de incidencias con SLA por severidad.
CP-ALE-01: alerta automática para incidencias CRÍTICAS.
"""
from django.conf import settings
from django.db import models

from apps.rooms.models import Habitacion

SEVERIDADES_INCIDENCIA = [
    ('CRITICO', 'Crítico'),
    ('ALTO', 'Alto'),
    ('MEDIO', 'Medio'),
    ('BAJO', 'Bajo'),
]


class Incidencia(models.Model):
    """Incidencia reportada sobre una habitación (CU8)."""
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    habitacion = models.ForeignKey(
        Habitacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidencias',
    )
    severidad = models.CharField(
        max_length=20,
        choices=SEVERIDADES_INCIDENCIA,
        default='MEDIO',
    )
    reportado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='incidencias_reportadas',
    )
    requiere_evidencia = models.BooleanField(default=False)
    creada_en = models.DateTimeField(auto_now_add=True)
    atendida_en = models.DateTimeField(null=True, blank=True)
    resuelta_en = models.DateTimeField(null=True, blank=True)
    comentario_resolucion = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'incidencia'
        ordering = ['-creada_en']
        verbose_name = 'incidencia'
        verbose_name_plural = 'incidencias'

    def __str__(self):
        return f'{self.titulo} ({self.severidad})'
