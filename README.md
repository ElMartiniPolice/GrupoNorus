# Grupo Norus — Plataforma de Gestión Hotelera

Proyecto de Título — **TIHI84** (Académico guía: German Reyes)
Equipo: Braiyelith Beltran · Ihan Montenegro · Martin Montt
Fecha de entrega: 29/09/2026

Plataforma móvil para centralizar la comunicación interna del hotel **Grupo Norus**:
asignación y seguimiento de tareas, registro de incidencias con SLA por severidad,
respaldo fotográfico, alertas en tiempo real y gestión de usuarios por área operativa.

## Arquitectura (3 capas)

| Capa | Tecnología |
|------|------------|
| Presentación | React Native (Expo) |
| Lógica de negocio | Django + Django REST Framework (Python) |
| Datos | MySQL (dev: SQLite) |
| Nube | AWS (EC2/ECS, RDS, S3 para evidencias) |
| Tiempo real | Django Channels + WebSockets |

## Estructura del repositorio

```
GrupoNorus/
├── backend/          # API REST (Django)
│   ├── config/       # settings (base/dev/prod), urls, asgi, wsgi
│   ├── apps/
│   │   ├── core/          # permisos por rol, KPIs, seed de datos
│   │   ├── users/         # USUARIO, ROL, AREA — login con RUT (JWT)
│   │   ├── rooms/         # HABITACION, TIPO_HABITACION, REGISTRO_ESTADIA
│   │   ├── tasks/         # ASIGNACION_TAREA, HISTORIAL_ESTADO_TAREA
│   │   ├── incidents/     # INCIDENCIA con SLA por severidad
│   │   ├── evidence/      # EVIDENCIA_FOTOGRAFICA (S3 + retención)
│   │   ├── notifications/ # NOTIFICACION + WebSockets (Channels)
│   │   ├── privacy/       # Ley N° 21.719: aviso versionado, consentimiento, derechos del titular
│   │   └── utils/         # validación de RUT chileno y helpers compartidos
│   ├── verify_*.py        # scripts de verificación de requisitos (CP/DP)
│   ├── manage.py
│   └── requirements.txt
└── frontend/         # App móvil (React Native + Expo)
    ├── src/
    │   ├── screens/      # auth, dashboard, tasks, incidents, rooms, admin, alertas, privacy
    │   ├── components/   # UI reutilizable
    │   ├── navigation/   # stacks por rol
    │   ├── services/     # api (JWT), auth, tasks, incidents, rooms, evidencias, KPIs, notificaciones, privacy, socket (WS)
    │   ├── context/      # AuthContext, NotificationContext
    │   ├── theme/        # paleta de colores y tipografías de la marca
    │   ├── utils/        # validación RUT, etiquetas, SLA
    │   └── config.js     # API_BASE_URL (EXPO_PUBLIC_API_URL) y URL del WebSocket
    ├── scripts/          # utilidades de build (write_config_json.py)
    ├── App.js
    └── package.json
```

## Puesta en marcha rápida

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # variables de entorno (SQLite por defecto en dev)
python manage.py migrate
python manage.py seed_demo   # datos de prueba (roles, áreas, usuarios, habitaciones)
python manage.py seed_aviso_privacidad  # aviso de privacidad v1.0 (Ley N° 21.719)
python manage.py runserver   # http://127.0.0.1:8000
```

> En desarrollo se usa **SQLite** automáticamente y las evidencias se guardan en
> `backend/media/` (S3 en producción). Para MySQL, configura `backend/.env` con
> `DB_ENGINE=mysql` y las credenciales (ver `config/settings/dev.py`).
>
> `seed_demo` es idempotente y crea usuarios de prueba con contraseña `norus123`.
> En producción, programa `python manage.py purgar_evidencias_vencidas` a diario
> para purgar evidencias vencidas (CP-DP-05).

### Frontend
```bash
cd frontend
npm install
# Opcional: define EXPO_PUBLIC_API_URL=http://<IP-DE-TU-PC>:8000/api
# (por defecto usa http://localhost:8000/api — ver src/config.js)
npx expo start
```

### WebSocket (notificaciones en tiempo real)
```bash
cd backend
python manage.py runserver   # daphne/uvicorn en producción
```
El cliente se conecta a `ws://<host>:8000/ws/notifications/<user_id>/`.

## API REST (endpoints principales)

| Ruta | Descripción |
|------|-------------|
| `/api/auth/login/` · `/refresh/` · `/logout/` · `/perfil/` | Autenticación JWT con RUT (CU4) |
| `/api/users/usuarios/` · `/roles/` · `/areas/` | Gestión de usuarios (CP-USR-01) |
| `/api/rooms/habitaciones/` · `/tipos/` · `/estadias/` | Habitaciones, tipos y estadías (CU1/CU3/CU10, CP-HAB-01) |
| `/api/tasks/tareas/` | Asignación y seguimiento de tareas (CU2/CU5/CU6/CU9) |
| `/api/incidents/incidencias/` | Incidencias con SLA (CU8, CP-ALE-01) |
| `/api/evidence/evidencias/` | Evidencias fotográficas (CP-FOT-01) |
| `/api/notifications/notificaciones/` | Notificaciones |
| `/api/privacy/…` | Ley N° 21.719 (ver sección siguiente) |
| `/api/core/kpis/` | KPIs del panel de administración (CP-ADM-01) |

Los endpoints aplican paginación (20 por página) y scoping por rol/área (CP-DP-02).

## Roles y áreas

- **Roles**: ADMINISTRADOR, OPERARIO, RECEPCION
- **Áreas**: RECEPCION, MANTENCION, HOUSEKEEPING
- Login con **RUT o credencial** + contraseña (no email) → JWT.

## SLA por severidad de incidencia

| Severidad | Respuesta | Resolución |
|-----------|-----------|------------|
| CRITICO   | Inmediato (alerta automática) | 30 min |
| ALTO      | 10 min | 2 h |
| MEDIO     | 30 min | 8 h (mismo turno) |
| BAJO      | 2 h | 24 h |

## Casos de uso implementados

| CU | Descripción | Módulo |
|----|-------------|--------|
| CU1 | Check-out | rooms |
| CU2 | Asignar tareas | tasks |
| CU3 | Check-in | rooms |
| CU4 | Iniciar sesión (RUT) | users |
| CU5 | Consultar tareas | tasks |
| CU6 | Actualizar estado de tarea | tasks |
| CU8 | Reportar incidencia | incidents |
| CU9 | Validar tarea | tasks |
| CU10 | Monitoreo de habitaciones | rooms |

## Privacidad y protección de datos (Ley N° 21.719)

El módulo `apps/privacy` implementa el cumplimiento de la Ley N° 21.719 (Chile):

| Endpoint | Función |
|----------|---------|
| `GET /api/privacy/aviso/` | Aviso de privacidad versionado (Instrumento N° 1) |
| `GET /api/privacy/consentimiento/actual/` | Estado del consentimiento del titular |
| `POST /api/privacy/consentimiento/aceptar/` | Aceptar la versión vigente del aviso |
| `POST /api/privacy/consentimiento/retirar/` | Retirar el consentimiento |
| `GET /api/privacy/derechos/mis-solicitudes/` | Solicitudes de derechos del titular |
| `POST /api/privacy/derechos/solicitudes/` | Ejercer un derecho (Instrumento N° 2) |
| `GET /api/privacy/derechos/exportar/` | Exportación de datos personales |
| `GET /api/privacy/admin/solicitudes/` | Panel de solicitudes (administrador) |
| `PATCH /api/privacy/admin/solicitudes/<id>/` | Responder una solicitud |
| `GET /api/privacy/admin/auditoria/` | Auditoría de accesos y exportaciones |

La retención de evidencias se controla con `EVIDENCE_RETENTION_DAYS` (365 días por defecto).

## Pruebas

```bash
cd backend
python manage.py test apps   # cubre CP-AUT-01/02, CP-USR-01, CP-TAR-01/02, CP-INC-01/02, CP-HAB-01, CP-DP-02...
```

## Scripts de verificación (backend/)

| Script | Verifica |
|--------|----------|
| `verify_ley_21719.py` | Flujo completo Ley N° 21.719: aviso → consentimiento → solicitud de derechos → exportación → panel admin → retiro. Autónomo (transacción con rollback, settings de CI) |
| `verify_crud_habitaciones.py` | Matriz de permisos CRUD de habitaciones (CP-HAB-01, CP-DP-02) |
| `verify_cambio_estado.py` | Cambio de estado de habitación con foto (multipart), scoping y validaciones |
| `verify_cp_dp02.py` | Scoping por área del operario y logout (CP-DP-02) |
| `verify_cp_fot01.py` | Subida de imágenes: solo JPG/PNG/WEBP reales ≤ 5 MB (CP-FOT-01) |
| `probe_cambio_estado.py` | Sonda rápida de la ruta `cambios_estado` |

> Salvo `verify_ley_21719.py`, los scripts requieren el servidor activo en `http://localhost:8000`
> y se ejecutan desde `backend/`.

## Licencia
Uso académico — INACAP IP / Proyecto de Título.
