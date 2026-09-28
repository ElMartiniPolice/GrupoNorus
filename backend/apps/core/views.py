"""Vistas del núcleo — panel de KPIs (CP-ADM-01)."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.kpis import resumen_kpis
from apps.core.permissions import IsAdmin


class KPIDashboardView(APIView):
    """
    Panel de indicadores para administradores.
    Devuelve los 5 KPIs SMART del proyecto (Sección IV del informe).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({'kpis': resumen_kpis()})
