"""Vistas del núcleo — panel de KPIs (CP-ADM-01) y health check."""
from django.db import connection
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.kpis import resumen_kpis
from apps.core.permissions import IsAdmin


class HealthCheckView(APIView):
    """
    Health check para el Application Load Balancer de AWS (§11.3.2.1).
    Sin autenticación: verifica que la app responda y que la BD esté accesible.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception:
            return Response({'status': 'error', 'db': 'unreachable'}, status=503)
        return Response({'status': 'ok', 'db': 'ok'})


class KPIDashboardView(APIView):
    """
    Panel de indicadores para administradores.
    Devuelve los 5 KPIs SMART del proyecto (Sección IV del informe).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({'kpis': resumen_kpis(request.user.sede_id)})
