"""
Purga de evidencias y fotos de cambios de estado vencidas — Grupo Norus.

Retención de datos (Ley N° 21.719): las evidencias fotográficas y las
fotos de cambios de estado de habitaciones se eliminan —registro y
archivo— tras EVIDENCE_RETENTION_DAYS días.

Uso:
    python manage.py purgar_evidencias_vencidas

Idempotente: puede ejecutarse repetidamente (programar diario).
"""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.evidence.models import EvidenciaFotografica
from apps.rooms.models import CambioEstadoHabitacion


class Command(BaseCommand):
    """Elimina evidencias y fotos vencidas según la política de retención."""

    help = (
        'Elimina evidencias fotográficas y cambios de estado con más de '
        'EVIDENCE_RETENTION_DAYS días, junto con sus archivos.'
    )

    def handle(self, *args, **options):
        dias = getattr(settings, 'EVIDENCE_RETENTION_DAYS', 365)
        limite = timezone.now() - timedelta(days=dias)

        # --- 1) Evidencias fotográficas vencidas ---
        evidencias = EvidenciaFotografica.objects.filter(creada_en__lt=limite)
        total_evidencias = evidencias.count()
        for evidencia in evidencias:
            if evidencia.imagen:
                evidencia.imagen.delete(save=False)
            evidencia.delete()

        # --- 2) Fotos de cambios de estado de habitaciones vencidas ---
        cambios = CambioEstadoHabitacion.objects.filter(fecha__lt=limite)
        total_cambios = cambios.count()
        for cambio in cambios:
            if cambio.foto:
                cambio.foto.delete(save=False)
            cambio.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Purga completada ({dias} días): {total_evidencias} evidencias '
                f'y {total_cambios} cambios de estado eliminados.'
            )
        )
