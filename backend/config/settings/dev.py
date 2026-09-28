"""Configuración de desarrollo — Grupo Norus."""
from .base import *  # noqa: F401,F403
from .base import MIDDLEWARE, config

DEBUG = True
ALLOWED_HOSTS = ['*']

# En dev permitimos cualquier origen (Expo Go / emuladores)
CORS_ALLOW_ALL_ORIGINS = True

# Chrome Private Network Access (PNA): permite preflights desde orígenes
# públicos (túneles de VS Code, p. ej. https://xxxx-8081.brs.devtunnels.ms)
# hacia localhost:8000. Debe ir ANTES de CorsMiddleware, que corta-circuita
# los preflights OPTIONS.
MIDDLEWARE = ['config.middleware.PrivateNetworkAccessMiddleware'] + MIDDLEWARE

# Logs verbosos en consola
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
