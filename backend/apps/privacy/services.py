"""Servicios de privacidad — Ley N° 21.719."""

from apps.privacy.models import RegistroAuditoria


def obtener_ip(request):
    """Obtiene la IP del cliente considerando proxies (X-Forwarded-For)."""
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def registrar_auditoria(usuario, accion, recurso='', detalle='', ip=None):
    """Registra una acción en la bitácora de auditoría (best-effort).

    Nunca interrumpe el flujo principal ante fallos de registro.
    """
    try:
        return RegistroAuditoria.objects.create(
            usuario=usuario,
            accion=accion,
            recurso=recurso,
            detalle=detalle,
            ip=ip,
        )
    except Exception:
        return None
