"""
Cálculo de KPIs — Grupo Norus (Sección IV del informe).

KPI 1: Tiempo de respuesta ante solicitudes e incidencias
KPI 2: Trazabilidad de solicitudes e incidencias registradas
KPI 3: Eficiencia en la asignación de habitaciones
KPI 4: Respaldo fotográfico de incidencias
KPI 5: Adopción de la plataforma por el personal operativo
"""
from datetime import timedelta

from django.conf import settings
from django.db.models import Avg, Count, F, Q
from django.utils import timezone


def kpi1_tiempo_respuesta(usuario=None):
    """
    Promedio de minutos entre la creación de una incidencia y su primera
    atención (cambio de estado o respuesta registrada).
    Si se proporciona `usuario`, calcula el promedio solo para incidencias
    reportadas por ese usuario.
    Meta: < 15 min (huéspedes) / < 30 min (internos).
    """
    from apps.incidents.models import Incidencia

    filtros = Q(atendida_en__isnull=False, creada_en__isnull=False)
    if usuario is not None:
        filtros &= Q(reportado_por=usuario)

    qs = Incidencia.objects.filter(filtros)
    agg = qs.annotate(
        minutos=Avg(F('atendida_en') - F('creada_en'))
    ).aggregate(promedio=Avg('minutos'))
    promedio = agg['promedio']
    return {
        'kpi': 'KPI 1 — Tiempo de respuesta',
        'promedio_minutos': round(promedio.total_seconds() / 60, 1) if promedio else None,
        'meta_minutos': 15,
        'incidencias_mediciones': qs.count(),
    }


def kpi2_trazabilidad(usuario=None):
    """
    Porcentaje de solicitudes/incidencias registradas en la plataforma
    respecto del total de reportes. Meta: 100% en 2 meses.
    Si se proporciona `usuario`, cuenta solo sus registros (incidencias
    reportadas + tareas asignadas).
    """
    from apps.incidents.models import Incidencia
    from apps.tasks.models import AsignacionTarea

    incidencias = Incidencia.objects.all()
    tareas = AsignacionTarea.objects.all()
    if usuario is not None:
        incidencias = incidencias.filter(reportado_por=usuario)
        tareas = tareas.filter(asignado_a=usuario)

    total = incidencias.count() + tareas.count()
    return {
        'kpi': 'KPI 2 — Trazabilidad',
        'registros_plataforma': total,
        'meta_porcentaje': 100,
    }


def kpi3_asignacion_habitaciones(usuario=None):
    """
    Porcentaje de asignaciones de habitaciones sin conflictos de duplicidad.
    Meta: 95% (mes 1) → 98% (mes 3).
    Si se proporciona `usuario`, mide solo las asignaciones (check-in)
    registradas por ese usuario.
    """
    from apps.rooms.models import RegistroEstadia

    qs = RegistroEstadia.objects.all()
    if usuario is not None:
        qs = qs.filter(registrado_por=usuario)

    total = qs.count()
    con_conflicto = qs.filter(conflicto=True).count()
    sin_conflicto = total - con_conflicto
    porcentaje = round((sin_conflicto / total) * 100, 1) if total else None
    return {
        'kpi': 'KPI 3 — Asignación de habitaciones',
        'total_asignaciones': total,
        'sin_conflicto': sin_conflicto,
        'porcentaje_sin_conflicto': porcentaje,
        'meta_porcentaje': 95,
    }


def kpi4_respaldo_fotografico(usuario=None):
    """
    Porcentaje de incidencias que requieren evidencia visual y que cuentan
    con fotografías subidas. Meta: 100% en 2 meses.
    Si se proporciona `usuario`, mide solo las incidencias que reportó.
    """
    from apps.evidence.models import EvidenciaFotografica
    from apps.incidents.models import Incidencia

    requieren = Incidencia.objects.filter(requiere_evidencia=True)
    if usuario is not None:
        requieren = requieren.filter(reportado_por=usuario)
    con_evidencia = requieren.filter(
        id__in=EvidenciaFotografica.objects.values_list('incidencia_id', flat=True)
    ).count()
    total = requieren.count()
    porcentaje = round((con_evidencia / total) * 100, 1) if total else None
    return {
        'kpi': 'KPI 4 — Respaldo fotográfico',
        'incidencias_con_evidencia_requerida': total,
        'con_foto': con_evidencia,
        'porcentaje': porcentaje,
        'meta_porcentaje': 100,
    }


def kpi5_adopcion(usuario=None):
    """
    Usuarios activos por día / total de colaboradores registrados.
    Meta: 80% (mes 1) → 95% (mes 3).
    Si se proporciona `usuario`, entrega su propia actividad (activo hoy).
    """
    from apps.users.models import Usuario

    hoy = timezone.now().date()

    if usuario is not None:
        activo_hoy = bool(
            usuario.ultimo_acceso and usuario.ultimo_acceso.date() == hoy
        )
        return {
            'kpi': 'KPI 5 — Adopción de la plataforma',
            'activo_hoy': activo_hoy,
            'porcentaje': 100 if activo_hoy else 0,
            'meta_porcentaje': 80,
        }

    activos_hoy = Usuario.objects.filter(
        ultimo_acceso__date=hoy
    ).count()
    total = Usuario.objects.filter(is_active=True).count()
    porcentaje = round((activos_hoy / total) * 100, 1) if total else None
    return {
        'kpi': 'KPI 5 — Adopción de la plataforma',
        'usuarios_activos_hoy': activos_hoy,
        'usuarios_totales': total,
        'porcentaje': porcentaje,
        'meta_porcentaje': 80,
    }


def resumen_kpis(usuario=None):
    """
    Panel de administración (CP-ADM-01): todos los KPI en un endpoint.
    Si se proporciona `usuario`, devuelve los KPI de esa persona.
    """
    return [
        kpi1_tiempo_respuesta(usuario),
        kpi2_trazabilidad(usuario),
        kpi3_asignacion_habitaciones(usuario),
        kpi4_respaldo_fotografico(usuario),
        kpi5_adopcion(usuario),
    ]


def kpis_por_usuario():
    """
    Vista por persona (CP-ADM-01): devuelve los KPI de cada usuario activo
    junto con sus datos de identificación y rol.
    """
    from apps.users.models import Usuario

    usuarios = (
        Usuario.objects.filter(is_active=True)
        .select_related('rol', 'area')
        .order_by('apellido', 'nombre')
    )
    resultado = []
    for u in usuarios:
        resultado.append({
            'usuario': {
                'id': u.id,
                'rut': u.rut,
                'nombre': u.nombre,
                'apellido': u.apellido,
                'nombre_completo': f'{u.nombre} {u.apellido}',
                'rol': u.rol.nombre if u.rol_id else None,
                'area': u.area.nombre if u.area_id else None,
            },
            'kpis': resumen_kpis(u),
        })
    return resultado
