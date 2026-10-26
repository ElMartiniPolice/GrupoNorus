"""
Configuración para la demo en una sola instancia EC2 (HTTP, sin balanceador).

Parte de prod.py y cambia solo lo necesario para correr sin HTTPS y
con las evidencias en S3 usando el rol de la instancia (sin claves).
"""
from .prod import *  # noqa: F401,F403
from .base import config

# La demo se sirve por HTTP: con la redirección a HTTPS activa, el
# navegador no podría abrir la aplicación.
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Necesario para entrar al admin de Django (/admin/) por HTTP.
CSRF_TRUSTED_ORIGINS = [
    o for o in config('CSRF_TRUSTED_ORIGINS', default='').split(',') if o
]

# base.py solo activa S3 si hay AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY.
# En el Learner Lab la EC2 usa LabInstanceProfile, así que no hay claves:
# boto3 las obtiene del rol de la instancia.
AWS_ACCESS_KEY_ID = None
AWS_SECRET_ACCESS_KEY = None
AWS_S3_SIGNATURE_VERSION = 's3v4'
STORAGES = {
    'default': {'BACKEND': 'storages.backends.s3.S3Storage'},
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}
