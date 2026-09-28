"""URLs del núcleo — Grupo Norus."""
from django.urls import path

from apps.core.views import KPIDashboardView

urlpatterns = [
    path('kpis/', KPIDashboardView.as_view(), name='kpis-dashboard'),
]
