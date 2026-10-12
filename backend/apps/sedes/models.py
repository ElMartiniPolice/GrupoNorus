from django.db import models


class Sede(models.Model):
    nombre = models.CharField('nombre', max_length=100, unique=True)
    direccion = models.CharField('dirección', max_length=200, blank=True, default='')
    activo = models.BooleanField('activo', default=True)
    creado_en = models.DateTimeField('creado en', auto_now_add=True)

    class Meta:
        db_table = 'sede'
        ordering = ['nombre']
        verbose_name = 'sede'
        verbose_name_plural = 'sedes'

    def __str__(self):
        return self.nombre
