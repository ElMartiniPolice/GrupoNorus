"""
Settings para comandos de gestión (makemigrations, migrate, check, shell)
en entornos restringidos sin loopback (p. ej. sandbox de herramientas).

Omite `daphne`: al importarse crea un event loop de asyncio y, en Windows,
el self-pipe del SelectorEventLoop usa socketpair con accept() bloqueante
sobre 127.0.0.1, lo que se cuelga indefinidamente donde el loopback no está
disponible.

NO usar estos settings con `runserver`: el servidor de desarrollo necesita
daphne para servir ASGI (Channels/websockets).

Uso:
    python manage.py makemigrations --settings=config.settings.mgmt
    python manage.py migrate --settings=config.settings.mgmt
    python manage.py check --settings=config.settings.mgmt
"""
from .base import *

INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "daphne"]
