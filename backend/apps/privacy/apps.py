"""Configuración de la app privacidad."""

from django.apps import AppConfig


class PrivacyConfig(AppConfig):
    """Privacidad y derechos del titular — Ley N° 21.719."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.privacy'
    verbose_name = 'Privacidad'
