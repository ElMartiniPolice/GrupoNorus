from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsAdminOrRecepcion

from .models import InventarioItem
from .serializers import InventarioItemSerializer


class InventarioItemViewSet(viewsets.ModelViewSet):
    queryset = InventarioItem.objects.select_related('sede', 'habitacion', 'actualizado_por').all()
    serializer_class = InventarioItemSerializer
    filterset_fields = ['categoria', 'sede', 'habitacion']
    search_fields = ['nombre', 'categoria', 'notas']

    def get_queryset(self):
        qs = super().get_queryset()
        sede_id = self.request.user.sede_id
        return qs.filter(sede_id=sede_id) if sede_id else qs.none()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrRecepcion()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(actualizado_por=self.request.user, sede=self.request.user.sede)

    def perform_update(self, serializer):
        serializer.save(actualizado_por=self.request.user, sede=self.request.user.sede)
