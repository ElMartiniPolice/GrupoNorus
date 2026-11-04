"""URLs del núcleo — Grupo Norus."""
from django.urls import path

from apps.core.views import KPIDashboardView, KPIUsuariosView

urlpatterns = [
    path('kpis/', KPIDashboardView.as_view(), name='kpis-dashboard'),
    path('kpis/usuarios/', KPIUsuariosView.as_view(), name='kpis-usuarios'),
]
