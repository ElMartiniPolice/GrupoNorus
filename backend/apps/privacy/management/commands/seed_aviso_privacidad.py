"""
Carga del aviso de privacidad inicial — Grupo Norus.

Crea (o actualiza) el aviso de privacidad v1.0 requerido por la
Ley N° 21.719 con el contenido del Instrumento N° 1.

Uso:
    python manage.py seed_aviso_privacidad

Idempotente: actualiza el aviso v1.0 si ya existe.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.privacy.models import AvisoPrivacidad

CONTENIDO = """Grupo Norus — Aviso de privacidad y protección de datos personales

1. Responsable del tratamiento
Grupo Norus es responsable del tratamiento de sus datos personales en
la aplicación interna de gestión hotelera (habitaciones, tareas,
incidencias y evidencias).

2. Datos que tratamos
- Identificación: RUT, nombre, apellido y teléfono.
- Laborales: rol, área y estado de actividad.
- Operativos: tareas asignadas y realizadas, incidencias reportadas,
  evidencias fotográficas asociadas a incidencias, cambios de estado
  de habitaciones y notificaciones internas.
- Técnicos: dirección IP y registros de acceso a la aplicación.

3. Finalidades del tratamiento
- Gestión interna del personal y de las operaciones hoteleras.
- Coordinación, asignación y seguimiento de tareas e incidencias.
- Seguridad de la información y cumplimiento de obligaciones legales.

4. Plazos de retención
Los datos se conservan mientras exista la relación laboral o
contractual. Las evidencias fotográficas y las fotos de cambios de
estado se eliminan transcurridos 365 días desde su registro.

5. Sus derechos (Ley N° 21.719)
Como titular de los datos puede ejercer en cualquier momento, desde la
sección "Privacidad" de esta aplicación, sus derechos de:
- Acceso a sus datos personales.
- Rectificación y actualización.
- Supresión (eliminación).
- Oposición al tratamiento.
- Portabilidad (exportación de sus datos).

Las solicitudes se responden dentro de los plazos legales. También
puede retirar su consentimiento en cualquier momento desde la misma
sección, sin efectos retroactivos.

6. Seguridad
Aplicamos medidas técnicas y organizativas apropiadas para proteger
sus datos personales contra acceso no autorizado, pérdida o alteración,
incluyendo autenticación por token, control de acceso por rol y
bitácora de auditoría de accesos.

7. Modificaciones
Cualquier modificación de este aviso se publicará como una nueva
versión en la aplicación, la cual le será notificada para su
aceptación.

8. Contacto
Para consultas sobre este aviso o el tratamiento de sus datos,
contacte al administrador de la aplicación o al área de prevención
de riesgos de Grupo Norus.

Fecha de vigencia: se indica en la versión publicada en la aplicación."""


class Command(BaseCommand):
    """Crea o actualiza el aviso de privacidad v1.0 (Ley N° 21.719)."""

    help = 'Carga el aviso de privacidad v1.0 (idempotente).'

    def handle(self, *args, **options):
        aviso, creado = AvisoPrivacidad.objects.update_or_create(
            version='1.0',
            defaults={
                'titulo': 'Aviso de privacidad y protección de datos personales',
                'contenido': CONTENIDO,
                'vigente_desde': timezone.now(),
                'activo': True,
            },
        )
        if creado:
            self.stdout.write(
                self.style.SUCCESS(f'Aviso de privacidad v1.0 creado (id={aviso.id}).')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Aviso de privacidad v1.0 actualizado (id={aviso.id}).')
            )
