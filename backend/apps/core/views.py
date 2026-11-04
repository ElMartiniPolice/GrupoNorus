"""Vistas del núcleo — panel de KPIs (CP-ADM-01)."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.kpis import kpis_por_usuario, resumen_kpis
from apps.core.permissions import IsAdmin
from apps.users.models import Usuario


class KPIDashboardView(APIView):
    """
    Panel de indicadores para administradores.
    Devuelve los 5 KPIs SMART del proyecto (Sección IV del informe).

    `?usuario=<id>` → devuelve los KPI de esa persona.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        usuario_id = request.query_params.get('usuario')
        usuario = None
        if usuario_id:
            usuario = Usuario.objects.filter(pk=usuario_id).first()
            if usuario is None:
                return Response(
                    {'detail': 'Usuario no encontrado.'}, status=404,
                )
        return Response({
            'usuario': (
                {
                    'id': usuario.id,
                    'nombre_completo': f'{usuario.nombre} {usuario.apellido}',
                }
                if usuario else None
            ),
            'kpis': resumen_kpis(usuario),
        })


class KPIUsuariosView(APIView):
    """
    Vista por persona (CP-ADM-01): KPI de cada usuario activo.
    Devuelve los KPIs de todos los usuarios junto con sus datos de perfil.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({'usuarios': kpis_por_usuario()})
