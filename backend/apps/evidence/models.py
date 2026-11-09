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
        null=True,
        blank=True,
        related_name='evidencias',
        verbose_name='incidencia',
    )
    tarea = models.ForeignKey(
        'tasks.AsignacionTarea',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='evidencias',
        verbose_name='tarea',
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
        if self.incidencia_id:
            return f'Evidencia #{self.pk} — incidencia #{self.incidencia_id}'
        if self.tarea_id:
            return f'Evidencia #{self.pk} — tarea #{self.tarea_id}'
        return f'Evidencia #{self.pk}'


class ObjetoEncontrado(models.Model):
    """Objeto encontrado y reportado por un usuario del sistema."""
    nombre = models.CharField(max_length=150, verbose_name='objeto')
    descripcion = models.TextField(blank=True, verbose_name='descripción')
    ubicacion = models.CharField(max_length=150, verbose_name='ubicación')
    habitacion = models.ForeignKey(
        'rooms.Habitacion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='objetos_encontrados',
        verbose_name='habitación',
    )
    imagen = models.ImageField(
        upload_to='objetos_perdidos/%Y/%m/',
        blank=True,
        null=True,
        verbose_name='imagen',
    )
    encontrado_por = models.ForeignKey(
        'users.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='objetos_encontrados',
        verbose_name='encontrado por',
    )
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='fecha de registro')

    class Meta:
        db_table = 'objeto_encontrado'
        ordering = ['-creado_en']
        verbose_name = 'objeto encontrado'
        verbose_name_plural = 'objetos encontrados'

    def __str__(self):
        return f'{self.nombre} — {self.ubicacion}'
