from django.conf import settings
from django.db import models

ESTADOS_OBJETO = [
    ('EN_RESGUARDO', 'En resguardo'),
    ('ENTREGADO', 'Entregado'),
    ('DESCARTADO', 'Descartado'),
]


class ObjetoPerdido(models.Model):
    titulo = models.CharField('título', max_length=150)
    descripcion = models.TextField('descripción', blank=True, default='')
    categoria = models.CharField('categoría', max_length=50, blank=True, default='')
    sede = models.ForeignKey(
        'sedes.Sede',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='objetos_perdidos',
        verbose_name='sede',
    )
    habitacion = models.ForeignKey(
        'rooms.Habitacion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='objetos_perdidos',
        verbose_name='habitación',
    )
    ubicacion = models.CharField('ubicación', max_length=150, blank=True, default='')
    estado = models.CharField(
        'estado',
        max_length=20,
        choices=ESTADOS_OBJETO,
        default='EN_RESGUARDO',
    )
    imagen = models.ImageField(
        'imagen',
        upload_to='objetos_perdidos/%Y/%m/',
        blank=True,
        null=True,
    )
    reportado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='objetos_reportados',
        verbose_name='reportado por',
    )
    entregado_a = models.CharField('entregado a', max_length=150, blank=True, default='')
    encontrado_en = models.DateTimeField('encontrado en', auto_now_add=True)
    entregado_en = models.DateTimeField('entregado en', null=True, blank=True)

    class Meta:
        db_table = 'objeto_perdido'
        ordering = ['-encontrado_en']
        verbose_name = 'objeto perdido'
        verbose_name_plural = 'objetos perdidos'

    def __str__(self):
        return f'{self.titulo} ({self.estado})'
