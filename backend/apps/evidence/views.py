"""
Vistas de evidencias — Grupo Norus.

CP-FOT-01: subida de fotografías asociadas a incidencias.
CP-DP-05: retención por 365 días (política de datos).
KPI 4: evidencias por incidencia crítica.

El destino S3/local lo resuelve la configuración STORAGES
(django-storages S3Boto3Storage si hay credenciales AWS;
MEDIA local en desarrollo).
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import is_operario
from apps.rooms.services import habitaciones_del_operario

from .models import EvidenciaFotografica
from .serializers import EvidenciaFotograficaSerializer


class EvidenciaFotograficaViewSet(viewsets.ModelViewSet):
    """
    Evidencias fotográficas — CP-FOT-01.

    - POST multipart: `incidencia` (ID plano) + `imagen` (archivo).
    - `?incidencia=<id>` filtra por incidencia (IncidenciaDetailScreen).
    - `?habitacion=<id>`: registro fotográfico de una habitación.
    - CP-DP-02: un OPERARIO solo ve evidencias de SUS habitaciones.
    - `subida_por` se asigna automáticamente al usuario autenticado.
    """
    queryset = (
        EvidenciaFotografica.objects
        .select_related('incidencia', 'subida_por')
        .all()
    )
    serializer_class = EvidenciaFotograficaSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['incidencia']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_operario(user):
            qs = qs.filter(
                incidencia__habitacion__in=habitaciones_del_operario(user),
            )
        habitacion = self.request.query_params.get('habitacion')
        if habitacion:
            qs = qs.filter(incidencia__habitacion_id=habitacion)
        return qs

    def perform_create(self, serializer):
        serializer.save(subida_por=self.request.user)
