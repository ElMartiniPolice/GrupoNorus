"""
Settings para entornos restringidos (CI/sandbox) donde el loopback TCP
entrante está bloqueado y `daphne.apps` no puede inicializar su event loop
durante `django.setup()`.

Idéntico a dev, pero sin `daphne` en INSTALLED_APPS: `runserver` usará
WSGI en lugar de ASGI (sin websockets), lo cual es suficiente para
migraciones, seeds y pruebas REST.

NO usar en desarrollo local normal ni en producción.
"""

from .dev import *  # noqa: F401,F403

INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "daphne"]
