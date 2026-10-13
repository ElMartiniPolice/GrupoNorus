"""URLs del núcleo — Grupo Norus."""
from django.urls import path

from apps.core.views import HealthCheckView, KPIDashboardView

urlpatterns = [
    path('kpis/', KPIDashboardView.as_view(), name='kpis-dashboard'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
]
