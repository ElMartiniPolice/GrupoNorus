from django.conf import settings
from django.db import models

from apps.rooms.models import Habitacion

SEVERIDADES_INCIDENCIA = [
    ("CRITICO", "Critico"),
    ("ALTO", "Alto"),
    ("MEDIO", "Medio"),
    ("BAJO", "Bajo"),
]

ESTADOS_INCIDENCIA = [
    ("CREADA", "Creada"),
    ("ASIGNADA", "Asignada"),
    ("EN_PROGRESO", "En progreso"),
    ("RESUELTA", "Resuelta"),
    ("VALIDADA", "Validada"),
    ("CERRADA", "Cerrada"),
]

class Incidencia(models.Model):
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    habitacion = models.ForeignKey(
        Habitacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidencias",
    )
    severidad = models.CharField(
        max_length=20,
        choices=SEVERIDADES_INCIDENCIA,
        default="MEDIO",
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_INCIDENCIA,
        default="CREADA",
    )
    reportado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="incidencias_reportadas",
    )
    requiere_evidencia = models.BooleanField(default=False)
    creada_en = models.DateTimeField(auto_now_add=True)
    atendida_en = models.DateTimeField(null=True, blank=True)
    asignada_en = models.DateTimeField(null=True, blank=True)
    iniciada_en = models.DateTimeField(null=True, blank=True)
    validada_en = models.DateTimeField(null=True, blank=True)
    cerrada_en = models.DateTimeField(null=True, blank=True)
    resuelta_en = models.DateTimeField(null=True, blank=True)
    comentario_resolucion = models.TextField(blank=True, default="")
    comentario_validacion = models.TextField(blank=True, default="")
    usuario_ultima_transicion = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidencias_transicion",
    )
    tiempo_ultima_transicion = models.DurationField(null=True, blank=True)

    class Meta:
        db_table = "incidencia"
        ordering = ["-creada_en"]
        verbose_name = "incidencia"
        verbose_name_plural = "incidencias"

    def __str__(self):
        return "%s (%s)" % (self.titulo, self.severidad)


class Solicitud(models.Model):
    ESTADOS_SOLICITUD = [
        ("COTIZACION", "Cotizacion"),
        ("APROBACION", "Aprobacion"),
        ("EJECUCION", "Ejecucion"),
        ("COMPLETADA", "Completada"),
        ("CANCELADA", "Cancelada"),
    ]
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    habitacion = models.ForeignKey(
        Habitacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="solicitudes",
    )
    cotizacion = models.CharField(max_length=100, help_text="Monto o referencia del presupuesto")
    empresa_contratista = models.CharField(max_length=150, help_text="Compania encargada de la obra")
    aprobado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="solicitudes_aprobadas",
    )
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(
        max_length=20,
        choices=[("COTIZACION", "Cotizacion"), ("APROBACION", "Aprobacion"), ("EJECUCION", "Ejecucion"), ("COMPLETADA", "Completada"), ("CANCELADA", "Cancelada")],
        default="COTIZACION",
    )
    requiere_evidencia = models.BooleanField(default=False)
    creada_en = models.DateTimeField(auto_now_add=True)
    comentario = models.TextField(blank=True, default="")

    class Meta:
        db_table = "solicitud"
        ordering = ["-creada_en"]
        verbose_name = "solicitud"
        verbose_name_plural = "solicitudes"

    def __str__(self):
        return "%s (%s)" % (self.titulo, self.get_estado_display())