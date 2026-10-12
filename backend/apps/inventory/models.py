from django.conf import settings
from django.db import models


class InventarioItem(models.Model):
    nombre = models.CharField('nombre', max_length=150)
    categoria = models.CharField('categoría', max_length=50, blank=True, default='')
    sede = models.ForeignKey(
        'sedes.Sede',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventario',
        verbose_name='sede',
    )
    habitacion = models.ForeignKey(
        'rooms.Habitacion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventario',
        verbose_name='habitación',
    )
    cantidad = models.IntegerField('cantidad', default=1)
    stock_minimo = models.IntegerField('stock mínimo', default=0)
    notas = models.TextField('notas', blank=True, default='')
    actualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventario_actualizado',
        verbose_name='actualizado por',
    )
    actualizado_en = models.DateTimeField('actualizado en', auto_now=True)
    creado_en = models.DateTimeField('creado en', auto_now_add=True)

    class Meta:
        db_table = 'inventario_item'
        ordering = ['nombre']
        verbose_name = 'item de inventario'
        verbose_name_plural = 'items de inventario'

    def __str__(self):
        return f'{self.nombre} (x{self.cantidad})'
