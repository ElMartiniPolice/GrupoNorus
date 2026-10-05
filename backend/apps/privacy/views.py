"""
Vistas de privacidad y protección de datos personales — Grupo Norus.

Ley N° 21.719: aviso de privacidad versionado, consentimiento
informado, ejercicio de derechos del titular y bitácora de auditoría.

Contrato de API (LoginScreen / ConsentScreen / PrivacyScreen):
- GET   /aviso/                    → aviso vigente (público, login).
- GET   /consentimiento/actual/    → estado del consentimiento del usuario.
- POST  /consentimiento/aceptar/   → acepta el aviso vigente (timestamp + versión).
- POST  /consentimiento/retirar/   → retira el consentimiento activo.
- GET   /derechos/mis-solicitudes/ → solicitudes del titular autenticado.
- POST  /derechos/solicitudes/     → crea solicitud de derechos (notifica a admins).
- GET   /derechos/exportar/        → exportación de datos del titular (portabilidad).
- GET   /admin/solicitudes/        → todas las solicitudes (ADMINISTRADOR).
- PATCH /admin/solicitudes/<id>/   → actualiza estado/respuesta (ADMINISTRADOR).
- GET   /admin/auditoria/          → bitácora de auditoría (ADMINISTRADOR).
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdmin
from apps.evidence.serializers import EvidenciaFotograficaSerializer
from apps.incidents.serializers import IncidenciaSerializer
from apps.notifications.serializers import NotificacionSerializer
from apps.notifications.services import notificar
from apps.tasks.serializers import AsignacionTareaSerializer
from apps.users.models import Usuario
from apps.users.serializers import UsuarioSerializer

from .models import AvisoPrivacidad, Consentimiento, RegistroAuditoria, SolicitudDerechos
from .serializers import (
    AvisoPrivacidadSerializer,
    ConsentimientoSerializer,
    RegistroAuditoriaSerializer,
    SolicitudDerechosAdminSerializer,
    SolicitudDerechosSerializer,
)
from .services import obtener_ip, registrar_auditoria


def _aviso_vigente():
    return AvisoPrivacidad.objects.filter(activo=True).first()


class AvisoView(APIView):
    """Aviso de privacidad vigente (público, se muestra en el login)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        aviso = _aviso_vigente()
        if not aviso:
            return Response(
                {'detail': 'No hay un aviso de privacidad vigente.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(AvisoPrivacidadSerializer(aviso).data)


class ConsentimientoActualView(APIView):
    """Estado del consentimiento del usuario autenticado.

    `pendiente=True` cuando el aviso vigente aún no ha sido aceptado
    (o cambió de versión): el frontend muestra el gate de consentimiento.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        aviso = _aviso_vigente()
        consentimiento = (
            Consentimiento.objects
            .filter(usuario=request.user, activo=True)
            .select_related('aviso', 'usuario__rol', 'usuario__area')
            .first()
        )
        pendiente = bool(
            aviso and (consentimiento is None or consentimiento.aviso_id != aviso.id)
        )
        return Response({
            'aviso': AvisoPrivacidadSerializer(aviso).data if aviso else None,
            'consentimiento': (
                ConsentimientoSerializer(consentimiento).data if consentimiento else None
            ),
            'pendiente': pendiente,
        })


class ConsentimientoAceptarView(APIView):
    """Aceptación del aviso de privacidad vigente (timestamp + versión)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        aviso = _aviso_vigente()
        if not aviso:
            return Response(
                {'detail': 'No hay un aviso de privacidad vigente.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        existente = Consentimiento.objects.filter(
            usuario=request.user, aviso=aviso, activo=True,
        ).first()
        if existente:
            return Response(ConsentimientoSerializer(existente).data)
        # Deja constancia de retiro de versiones anteriores y registra la nueva.
        Consentimiento.objects.filter(usuario=request.user, activo=True).update(
            activo=False, retirado_en=timezone.now(),
        )
        consentimiento = Consentimiento.objects.create(
            usuario=request.user, aviso=aviso, activo=True,
        )
        registrar_auditoria(
            request.user,
            'CONSENTIMIENTO_ACEPTADO',
            recurso=f'aviso_privacidad/{aviso.version}',
            ip=obtener_ip(request),
        )
        return Response(
            ConsentimientoSerializer(consentimiento).data,
            status=status.HTTP_201_CREATED,
        )


class ConsentimientoRetirarView(APIView):
    """Retiro del consentimiento activo (deja constancia con timestamp)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        consentimiento = Consentimiento.objects.filter(
            usuario=request.user, activo=True,
        ).select_related('aviso').first()
        if not consentimiento:
            return Response(
                {'detail': 'No hay un consentimiento activo que retirar.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        consentimiento.activo = False
        consentimiento.retirado_en = timezone.now()
        consentimiento.save(update_fields=['activo', 'retirado_en'])
        registrar_auditoria(
            request.user,
            'CONSENTIMIENTO_RETIRADO',
            recurso=f'aviso_privacidad/{consentimiento.aviso.version}',
            ip=obtener_ip(request),
        )
        return Response(ConsentimientoSerializer(consentimiento).data)


class MisSolicitudesView(APIView):
    """Solicitudes de derechos del titular autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        solicitudes = (
            SolicitudDerechos.objects
            .filter(usuario=request.user)
            .select_related('usuario__rol', 'usuario__area')
        )
        return Response(SolicitudDerechosSerializer(solicitudes, many=True).data)


class SolicitudCreateView(APIView):
    """Crea una solicitud de ejercicio de derechos (art. 14 ter).

    Notifica a los administradores para su gestión dentro del plazo
    legal (10 días hábiles).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SolicitudDerechosSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        solicitud = serializer.save(usuario=request.user)
        registrar_auditoria(
            request.user,
            'SOLICITUD_DERECHO_CREADA',
            recurso=f'solicitud_derechos/{solicitud.id}',
            detalle=solicitud.tipo,
            ip=obtener_ip(request),
        )
        titular = f'{request.user.nombre} {request.user.apellido}'.strip()
        admins = Usuario.objects.filter(
            rol__nombre='ADMINISTRADOR', is_active=True,
        ).values_list('id', flat=True)
        for admin_id in admins:
            notificar(
                admin_id,
                'Nueva solicitud de derechos',
                f'{titular} solicitó {solicitud.get_tipo_display()} '
                f'(solicitud #{solicitud.id}).',
            )
        return Response(
            SolicitudDerechosSerializer(solicitud).data,
            status=status.HTTP_201_CREATED,
        )


class ExportarDatosView(APIView):
    """Portabilidad y acceso: exportación de los datos del titular.

    Reúne todos los datos personales del usuario autenticado
    (perfil, tareas, incidencias, evidencias, notificaciones,
    consentimientos y solicitudes) y registra el acceso en la
    bitácora de auditoría.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'titular': UsuarioSerializer(user).data,
            'tareas': AsignacionTareaSerializer(
                user.tareas.select_related(
                    'habitacion__tipo', 'asignado_a__rol', 'asignado_a__area',
                ), many=True,
            ).data,
            'incidencias': IncidenciaSerializer(
                user.incidencias_reportadas.select_related(
                    'habitacion__tipo', 'reportado_por__rol', 'reportado_por__area',
                ), many=True,
            ).data,
            'evidencias': EvidenciaFotograficaSerializer(
                user.evidencias_subidas.select_related(
                    'incidencia__habitacion__tipo', 'subida_por__rol', 'subida_por__area',
                ), many=True,
            ).data,
            'notificaciones': NotificacionSerializer(
                user.notificaciones.all(), many=True,
            ).data,
            'consentimientos': ConsentimientoSerializer(
                user.consentimientos.select_related('aviso', 'usuario__rol', 'usuario__area'),
                many=True,
            ).data,
            'solicitudes_derechos': SolicitudDerechosSerializer(
                user.solicitudes_derechos.select_related('usuario__rol', 'usuario__area'),
                many=True,
            ).data,
            'generado_en': timezone.now().isoformat(),
        }
        registrar_auditoria(
            request.user, 'DATOS_EXPORTADOS', recurso='titular',
            ip=obtener_ip(request),
        )
        return Response(data)


class AdminSolicitudesView(APIView):
    """Todas las solicitudes de derechos (ADMINISTRADOR)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        solicitudes = SolicitudDerechos.objects.select_related(
            'usuario__rol', 'usuario__area', 'resuelta_por',
        )
        estado = request.query_params.get('estado')
        if estado:
            solicitudes = solicitudes.filter(estado=estado)
        return Response(SolicitudDerechosAdminSerializer(solicitudes, many=True).data)


class AdminSolicitudDetalleView(APIView):
    """Actualiza estado/respuesta de una solicitud (ADMINISTRADOR)."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        solicitud = get_object_or_404(SolicitudDerechos, pk=pk)
        serializer = SolicitudDerechosAdminSerializer(
            solicitud, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        solicitud = serializer.save()
        if solicitud.estado in ('RESUELTA', 'RECHAZADA'):
            solicitud.resuelta_en = timezone.now()
            solicitud.resuelta_por = request.user
            solicitud.save(update_fields=['resuelta_en', 'resuelta_por'])
            notificar(
                solicitud.usuario_id,
                'Respuesta a su solicitud de derechos',
                f'Su solicitud #{solicitud.id} ({solicitud.get_tipo_display()}) '
                f'fue {solicitud.get_estado_display().lower()}.',
            )
        registrar_auditoria(
            request.user,
            'SOLICITUD_DERECHO_ACTUALIZADA',
            recurso=f'solicitud_derechos/{solicitud.id}',
            detalle=solicitud.estado,
            ip=obtener_ip(request),
        )
        return Response(SolicitudDerechosAdminSerializer(solicitud).data)


class AdminAuditoriaView(APIView):
    """Bitácora de auditoría de accesos a datos personales (ADMINISTRADOR)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        registros = RegistroAuditoria.objects.select_related(
            'usuario__rol', 'usuario__area',
        )
        accion = request.query_params.get('accion')
        if accion:
            registros = registros.filter(accion__icontains=accion)
        return Response(
            RegistroAuditoriaSerializer(registros[:500], many=True).data,
        )
