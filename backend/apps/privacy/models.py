"""Modelos de privacidad y protección de datos personales — Grupo Norus.

Implementa los instrumentos exigidos por la Ley N° 21.719: aviso de
privacidad versionado, registro de consentimientos, solicitudes de
ejercicio de derechos del titular y bitácora de auditoría.
"""

from django.conf import settings
from django.db import models


class AvisoPrivacidad(models.Model):
    """Aviso de privacidad versionado (Ley N° 21.719, art. 14 bis)."""

    version = models.CharField(max_length=20, unique=True)
    titulo = models.CharField(max_length=150)
    contenido = models.TextField()
    vigente_desde = models.DateTimeField()
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'aviso_privacidad'
        ordering = ['-vigente_desde']
        verbose_name = 'aviso de privacidad'
        verbose_name_plural = 'avisos de privacidad'

    def __str__(self):
        return f'Aviso de privacidad v{self.version}'


class Consentimiento(models.Model):
    """Constancia de aceptación o retiro del aviso de privacidad."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consentimientos',
        verbose_name='titular',
    )
    aviso = models.ForeignKey(
        AvisoPrivacidad,
        on_delete=models.PROTECT,
        related_name='consentimientos',
    )
    aceptado_en = models.DateTimeField(auto_now_add=True)
    retirado_en = models.DateTimeField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'consentimiento'
        ordering = ['-aceptado_en']
        verbose_name = 'consentimiento'
        verbose_name_plural = 'consentimientos'

    def __str__(self):
        estado = 'activo' if self.activo else 'retirado'
        return f'{self.usuario} · v{self.aviso.version} · {estado}'


class SolicitudDerechos(models.Model):
    """Solicitud de ejercicio de derechos del titular (art. 14 ter)."""

    TIPOS = [
        ('ACCESO', 'Acceso'),
        ('RECTIFICACION', 'Rectificación'),
        ('SUPRESION', 'Supresión'),
        ('OPOSICION', 'Oposición'),
        ('PORTABILIDAD', 'Portabilidad'),
        ('INFORMACION', 'Información'),
    ]
    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROCESO', 'En proceso'),
        ('RESUELTA', 'Resuelta'),
        ('RECHAZADA', 'Rechazada'),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='solicitudes_derechos',
        verbose_name='titular',
    )
    tipo = models.CharField(max_length=20, choices=TIPOS)
    detalle = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    respuesta = models.TextField(blank=True, default='')
    creada_en = models.DateTimeField(auto_now_add=True)
    resuelta_en = models.DateTimeField(null=True, blank=True)
    resuelta_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='solicitudes_resueltas',
    )

    class Meta:
        db_table = 'solicitud_derechos'
        ordering = ['-creada_en']
        verbose_name = 'solicitud de derechos del titular'
        verbose_name_plural = 'solicitudes de derechos del titular'

    def __str__(self):
        return f'{self.usuario} · {self.get_tipo_display()} · {self.estado}'


class RegistroAuditoria(models.Model):
    """Bitácora de acciones sobre datos personales (art. 14 ter)."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='auditorias',
        verbose_name='titular o funcionario',
    )
    accion = models.CharField(max_length=40)
    recurso = models.CharField(max_length=120, blank=True, default='')
    detalle = models.TextField(blank=True, default='')
    ip = models.GenericIPAddressField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'registro_auditoria'
        ordering = ['-creado_en']
        verbose_name = 'registro de auditoría'
        verbose_name_plural = 'registros de auditoría'

    def __str__(self):
        return f'{self.accion} · {self.usuario or "anónimo"} · {self.creado_en:%d-%m-%Y %H:%M}'
