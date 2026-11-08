"""
Vistas de evidencias — Grupo Norus.

CP-FOT-01: subida de fotografías asociadas a incidencias.
CP-DP-05: retención por 365 días (política de datos).
KPI 4: evidencias por incidencia crítica.

El destino S3/local lo resuelve la configuración STORAGES
(django-storages S3Boto3Storage si hay credenciales AWS;
MEDIA local en desarrollo).
"""
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import is_operario
from apps.rooms.services import habitaciones_del_operario

from .models import EvidenciaFotografica
from .serializers import EvidenciaFotograficaSerializer


class EvidenciaFotograficaViewSet(viewsets.ModelViewSet):
    """
    Evidencias fotográficas — CP-FOT-01.

    - POST multipart: `incidencia` o `tarea` (ID plano) + `imagen` (archivo).
    - `?incidencia=<id>` filtra por incidencia (IncidenciaDetailScreen).
    - `?tarea=<id>` filtra por tarea (TaskDetailScreen).
    - `?habitacion=<id>`: registro fotográfico de una habitación.
    - CP-DP-02: un OPERARIO solo ve evidencias de SUS habitaciones o tareas.
    - `subida_por` se asigna automáticamente al usuario autenticado.
    """
    queryset = (
        EvidenciaFotografica.objects
        .select_related('incidencia', 'tarea', 'subida_por')
        .all()
    )
    serializer_class = EvidenciaFotograficaSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['incidencia', 'tarea']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        tarea = self.request.query_params.get('tarea')
        if tarea:
            qs = qs.filter(tarea_id=tarea)
            if is_operario(user):
                qs = qs.filter(Q(tarea__asignado_a=user) | Q(subida_por=user))
            return qs

        incidencia = self.request.query_params.get('incidencia')
        if incidencia:
            qs = qs.filter(incidencia_id=incidencia)
            if is_operario(user):
                qs = qs.filter(
                    Q(incidencia__habitacion__in=habitaciones_del_operario(user)) |
                    Q(subida_por=user)
                )
            return qs

        habitacion = self.request.query_params.get('habitacion')
        if habitacion:
            return qs.filter(
                Q(incidencia__habitacion_id=habitacion) |
                Q(tarea__habitacion_id=habitacion)
            )

        if is_operario(user):
            qs = qs.filter(
                Q(incidencia__habitacion__in=habitaciones_del_operario(user)) |
                Q(tarea__asignado_a=user) |
                Q(subida_por=user)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(subida_por=self.request.user)
