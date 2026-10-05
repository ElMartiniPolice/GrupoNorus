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
│   │   └── notifications/ # NOTIFICACION + WebSockets (Channels)
│   ├── manage.py
│   └── requirements.txt
├── frontend/         # App móvil (React Native + Expo)
│   ├── src/
│   │   ├── screens/      # auth, dashboard, tasks, incidents, rooms, validation
│   │   ├── components/   # UI reutilizable
│   │   ├── navigation/   # stacks por rol
│   │   ├── services/     # api (JWT), auth, tasks, incidents, rooms
│   │   ├── context/      # AuthContext, NotificationContext
│   │   ├── sockets/      # cliente WebSocket
│   │   ├── hooks/        # useTasks, useIncidents, useRooms
│   │   └── utils/         # validación RUT, formatos
│   ├── App.js
│   └── package.json
└── docs/             # documentación técnica
```

## Puesta en marcha rápida

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo   # datos de prueba (roles, áreas, usuarios, habitaciones)
python manage.py runserver   # http://127.0.0.1:8000
```

> En desarrollo se usa **SQLite** automáticamente. Para MySQL, configura
> `backend/.env` con `DB_ENGINE=mysql` y las credenciales (ver `config/settings/dev.py`).

### Frontend
```bash
cd frontend
npm install
# Configura la IP de tu PC en src/config.js (API_BASE_URL)
npx expo start
```

### WebSocket (notificaciones en tiempo real)
```bash
cd backend
python manage.py runserver   # daphne/uvicorn en producción
```
El cliente se conecta a `ws://<host>:8000/ws/notifications/<user_id>/`.

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

## Pruebas

```bash
cd backend
python manage.py test apps   # cubre CP-AUT-01/02, CP-USR-01, CP-TAR-01/02, CP-INC-01/02, CP-HAB-01, CP-DP-02...
```

## Licencia
Uso académico — INACAP IP / Proyecto de Título.
