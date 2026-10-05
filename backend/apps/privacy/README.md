# Módulo de privacidad

Este módulo implementa el soporte base para la Ley N° 21.719 en Grupo Norus:

- aviso de privacidad versionado y público
- registro y retiro de consentimiento informado
- ejercicio de derechos del titular
- exportación de datos personales
- panel administrativo para solicitudes y bitácora de auditoría
- retención de evidencias y limpieza de registros vencidos

## Endpoints principales

- `GET /api/privacy/aviso/`
- `GET /api/privacy/consentimiento/actual/`
- `POST /api/privacy/consentimiento/aceptar/`
- `POST /api/privacy/consentimiento/retirar/`
- `GET /api/privacy/derechos/mis-solicitudes/`
- `POST /api/privacy/derechos/solicitudes/`
- `GET /api/privacy/derechos/exportar/`
- `GET /api/privacy/admin/solicitudes/`
- `PATCH /api/privacy/admin/solicitudes/<id>/`
- `GET /api/privacy/admin/auditoria/`

## Instrumentos de cumplimiento

- **Instrumento N° 1**: aviso de privacidad y catálogo resumido de tratamiento.
- **Instrumento N° 2**: mecanismo operativo para solicitudes de derechos y trazabilidad.

## Verificación

La comprobación funcional está en `backend/verify_ley_21719.py`.
