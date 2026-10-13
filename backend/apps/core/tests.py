"""Tests del núcleo — health check y KPIs."""
import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_health_check_ok(client):
    """El health check del ALB responde 200 sin autenticación."""
    response = client.get(reverse('health-check'))
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
    assert response.json()['db'] == 'ok'


@pytest.mark.django_db
def test_kpis_requiere_autenticacion(client):
    """El panel de KPIs no es accesible sin credenciales."""
    response = client.get(reverse('kpis-dashboard'))
    assert response.status_code == 401
