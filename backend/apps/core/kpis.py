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


def kpi1_tiempo_respuesta():
    """
    Promedio de minutos entre la creación de una incidencia y su primera
    atención (cambio de estado o respuesta registrada).
    Meta: < 15 min (huéspedes) / < 30 min (internos).
    """
    from apps.incidents.models import Incidencia

    qs = Incidencia.objects.filter(
        atendida_en__isnull=False,
        creada_en__isnull=False,
    )
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


def kpi2_trazabilidad():
    """
    Porcentaje de solicitudes/incidencias registradas en la plataforma
    respecto del total de reportes. Meta: 100% en 2 meses.
    """
    from apps.incidents.models import Incidencia
    from apps.tasks.models import AsignacionTarea

    total = Incidencia.objects.count() + AsignacionTarea.objects.count()
    return {
        'kpi': 'KPI 2 — Trazabilidad',
        'registros_plataforma': total,
        'meta_porcentaje': 100,
    }


def kpi3_asignacion_habitaciones():
    """
    Porcentaje de asignaciones de habitaciones sin conflictos de duplicidad.
    Meta: 95% (mes 1) → 98% (mes 3).
    """
    from apps.rooms.models import RegistroEstadia

    total = RegistroEstadia.objects.count()
    con_conflicto = RegistroEstadia.objects.filter(conflicto=True).count()
    sin_conflicto = total - con_conflicto
    porcentaje = round((sin_conflicto / total) * 100, 1) if total else None
    return {
        'kpi': 'KPI 3 — Asignación de habitaciones',
        'total_asignaciones': total,
        'sin_conflicto': sin_conflicto,
        'porcentaje_sin_conflicto': porcentaje,
        'meta_porcentaje': 95,
    }


def kpi4_respaldo_fotografico():
    """
    Porcentaje de incidencias que requieren evidencia visual y que cuentan
    con fotografías subidas. Meta: 100% en 2 meses.
    """
    from apps.evidence.models import EvidenciaFotografica
    from apps.incidents.models import Incidencia

    requieren = Incidencia.objects.filter(requiere_evidencia=True)
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


def kpi5_adopcion():
    """
    Usuarios activos por día / total de colaboradores registrados.
    Meta: 80% (mes 1) → 95% (mes 3).
    """
    from apps.users.models import Usuario

    hoy = timezone.now().date()
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


def resumen_kpis():
    """Panel de administración (CP-ADM-01): todos los KPI en un endpoint."""
    return [
        kpi1_tiempo_respuesta(),
        kpi2_trazabilidad(),
        kpi3_asignacion_habitaciones(),
        kpi4_respaldo_fotografico(),
        kpi5_adopcion(),
    ]
