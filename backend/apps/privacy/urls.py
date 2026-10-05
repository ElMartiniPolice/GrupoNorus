"""Rutas de privacidad — Grupo Norus."""

from django.urls import path

from . import views

urlpatterns = [
    # Aviso de privacidad (público, login).
    path('aviso/', views.AvisoView.as_view(), name='aviso'),
    # Consentimiento informado.
    path(
        'consentimiento/actual/',
        views.ConsentimientoActualView.as_view(),
        name='consentimiento-actual',
    ),
    path(
        'consentimiento/aceptar/',
        views.ConsentimientoAceptarView.as_view(),
        name='consentimiento-aceptar',
    ),
    path(
        'consentimiento/retirar/',
        views.ConsentimientoRetirarView.as_view(),
        name='consentimiento-retirar',
    ),
    # Derechos del titular.
    path(
        'derechos/mis-solicitudes/',
        views.MisSolicitudesView.as_view(),
        name='mis-solicitudes',
    ),
    path(
        'derechos/solicitudes/',
        views.SolicitudCreateView.as_view(),
        name='solicitudes-crear',
    ),
    path(
        'derechos/exportar/',
        views.ExportarDatosView.as_view(),
        name='exportar-datos',
    ),
    # Gestión administrativa.
    path(
        'admin/solicitudes/',
        views.AdminSolicitudesView.as_view(),
        name='admin-solicitudes',
    ),
    path(
        'admin/solicitudes/<int:pk>/',
        views.AdminSolicitudDetalleView.as_view(),
        name='admin-solicitud-detalle',
    ),
    path(
        'admin/auditoria/',
        views.AdminAuditoriaView.as_view(),
        name='admin-auditoria',
    ),
]
