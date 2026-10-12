"""
Settings temporal SOLO para ejecutar comandos de migración desde el sandbox
de la herramienta de desarrollo, donde los sockets loopback están bloqueados
y daphne cuelga al crear su event loop durante el import (socketpair fallback).

NO usar en desarrollo ni producción: daphne debe permanecer en
INSTALLED_APPS para el runserver ASGI (channels/websockets).
"""
from .base import *  # noqa: F401,F403

INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'daphne']
