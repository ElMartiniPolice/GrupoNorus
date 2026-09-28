"""
Modelos de notificaciones — Grupo Norus.

CP-ALE-01: alertas en tiempo real vía WebSocket + listado REST.
"""
from django.conf import settings
from django.db import models


class Notificacion(models.Model):
    """Notificación dirigida a un usuario (CP-ALE-01)."""
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notificaciones',
        verbose_name='usuario',
    )
    titulo = models.CharField(max_length=150, verbose_name='título')
    mensaje = models.TextField(verbose_name='mensaje')
    leida = models.BooleanField(default=False, verbose_name='leída')
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacion'
        ordering = ['-creada_en']
        verbose_name = 'notificación'
        verbose_name_plural = 'notificaciones'

    def __str__(self):
        return f'{self.titulo} — {self.usuario}'
