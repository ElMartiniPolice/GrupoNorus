#!/usr/bin/env python
# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '.')

with open('apps/incidents/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ESTADOS_INCIDENCIA after SEVERIDADES_INCIDENCIA
old_severidades = """SEVERIDADES_INCIDENCIA = [
    ('CRITICO', 'Crítico'),
    ('ALTO', 'Alto'),
    ('MEDIO', 'Medio'),
    ('BAJO', 'Bajo'),


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
"""

new_content = """SEVERIDADES_INCIDENCIA = [
    ('CRITICO', 'Crítico'),
    ('ALTO', 'Alto'),
    ('MEDIO', 'Medio'),
    ('BAJO', 'Bajo'),
]

ESTADOS_INCIDENCIA = [
    ('CREADA', 'Creada'),
    ('ASIGNADA', 'Asignada'),
    ('EN_PROGRESO', 'En progreso'),
    ('RESUELTA', 'Resuelta'),
    ('VALIDADA', 'Validada'),
    ('CERRADA', 'Cerrada'),
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
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_INCIDENCIA,
        default='CREADA',
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
    validada_en = models.DateTimeField(null=True, blank=True)
    cerrada_en = models.DateTimeField(null=True, blank=True)
    comentario_resolucion = models.TextField(blank=True, default='')
    comentario_validacion = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'incidencia'
        ordering = ['-creada_en']
        verbose_name = 'incidencia'
        verbose_name_plural = 'incidencias'

    def __str__(self):
        return f'{self.titulo} ({self.severidad})'
"""

if old_severidades in content:
    content = content.replace(old_severidades, new_content)
    with open('apps/incidents/models.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("File updated successfully")
else:
    print("ERROR: Could not find the target string in the file")
    print("Looking for: SEVERIDADES_INCIDENCIA")