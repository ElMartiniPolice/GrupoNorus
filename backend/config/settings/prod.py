"""Configuración de producción — Grupo Norus (AWS)."""
from .base import *  # noqa: F401,F403
from .base import config

DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

# Seguridad (CP-DP-01)
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Channels con Redis en producción
if config('REDIS_URL', default=''):
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'url': config('REDIS_URL'),
            },
        }
    }
