from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrRecepcion

from .models import ObjetoPerdido
from .serializers import ObjetoPerdidoSerializer


class ObjetoPerdidoViewSet(viewsets.ModelViewSet):
    queryset = ObjetoPerdido.objects.select_related('sede', 'habitacion', 'reportado_por').all()
    serializer_class = ObjetoPerdidoSerializer
    filterset_fields = ['estado', 'sede', 'habitacion', 'categoria']
    search_fields = ['titulo', 'descripcion', 'categoria', 'ubicacion', 'entregado_a']

    def get_queryset(self):
        qs = super().get_queryset()
        sede_id = self.request.user.sede_id
        return qs.filter(sede_id=sede_id) if sede_id else qs.none()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'entregar', 'descartar'):
            return [IsAdminOrRecepcion()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reportado_por=self.request.user, sede=self.request.user.sede)

    def perform_update(self, serializer):
        serializer.save(sede=self.request.user.sede)

    @action(detail=True, methods=['post'])
    def entregar(self, request, pk=None):
        obj = self.get_object()
        if obj.estado == 'ENTREGADO':
            return Response({'detail': 'El objeto ya fue entregado.'}, status=status.HTTP_400_BAD_REQUEST)
        entregado_a = (request.data.get('entregado_a') or '').strip()
        obj.estado = 'ENTREGADO'
        obj.entregado_a = entregado_a or obj.entregado_a
        obj.entregado_en = timezone.now()
        obj.save(update_fields=['estado', 'entregado_a', 'entregado_en'])
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def descartar(self, request, pk=None):
        obj = self.get_object()
        if obj.estado == 'DESCARTADO':
            return Response({'detail': 'El objeto ya fue descartado.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.estado = 'DESCARTADO'
        obj.save(update_fields=['estado'])
        serializer = self.get_serializer(obj)
        return Response(serializer.data)
