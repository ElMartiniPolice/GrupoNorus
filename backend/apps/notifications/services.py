"""
Servicios de notificación — Grupo Norus.

CP-ALE-01: punto único para emitir notificaciones
(persistencia REST + push WebSocket al canal del usuario).

Uso (tasks/views.py, incidents/views.py):
    from apps.notifications.services import notificar
    notificar(usuario_id, 'Título', 'Mensaje')
    notificar(usuario_id=..., titulo=..., mensaje=...)
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notificacion


def notificar(usuario_id, titulo, mensaje):
    """
    Crea la notificación y la emite por WebSocket al usuario.

    - Persistencia: siempre (listado REST /notificaciones/).
    - Push: best-effort — si la capa de canales no está disponible,
      la notificación queda registrada igualmente.
    """
    if not usuario_id:
        return None
    notificacion = Notificacion.objects.create(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
    )
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notificaciones_{usuario_id}',
            {
                'type': 'notificar',
                'payload': {
                    'type': 'notificacion',
                    'data': {
                        'id': notificacion.id,
                        'titulo': notificacion.titulo,
                        'mensaje': notificacion.mensaje,
                        'leida': notificacion.leida,
                        'creada_en': notificacion.creada_en.isoformat(),
                    },
                },
            },
        )
    except Exception:
        # El push es best-effort; la notificación ya quedó registrada.
        pass
    return notificacion
