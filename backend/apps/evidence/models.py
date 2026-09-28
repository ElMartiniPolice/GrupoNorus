"""
Modelos de evidencias — Grupo Norus.

CP-FOT-01: registro fotográfico de incidencias.
CP-DP-05: retención de evidencias por 365 días.
KPI 4: % de incidencias críticas con evidencia fotográfica.
"""
from django.db import models


class EvidenciaFotografica(models.Model):
    """
    Fotografía que respalda una incidencia (CP-FOT-01).

    El destino del archivo lo resuelve la configuración STORAGES:
    S3 (bucket gruponorus-evidencias) con credenciales AWS,
    MEDIA local como respaldo en desarrollo.
    """
    incidencia = models.ForeignKey(
        'incidents.Incidencia',
        on_delete=models.CASCADE,
        related_name='evidencias',
        verbose_name='incidencia',
    )
    imagen = models.ImageField(
        upload_to='evidencias/%Y/%m/',
        verbose_name='imagen',
    )
    subida_por = models.ForeignKey(
        'users.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidencias_subidas',
        verbose_name='subida por',
    )
    subida_en = models.DateTimeField('subida en', auto_now_add=True)
    creada_en = models.DateTimeField('creada en', auto_now_add=True)

    class Meta:
        db_table = 'evidencia_fotografica'
        ordering = ['-creada_en']
        verbose_name = 'evidencia fotográfica'
        verbose_name_plural = 'evidencias fotográficas'

    def __str__(self):
        return f'Evidencia #{self.pk} — incidencia #{self.incidencia_id}'
