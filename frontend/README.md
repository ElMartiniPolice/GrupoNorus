# Grupo Norus — Frontend (React Native + Expo)

App móvil del personal del hotel Grupo Norus (Proyecto de Título). Aplica el
**Manual de Marca NORUS** (paleta y tipografías) y consume la API Django del
directorio `../backend`.

## Marca aplicada

| Uso | Color |
|---|---|
| Primario (headers, navegación) | `#0B3C5D` |
| Acento / acciones | `#328CC1` |
| Suave (badges, fondos) | `#B3CDE0` |
| Fondo de pantallas | `#ECECEC` |
| Destacados / advertencias | `#FFC858` |
| Errores / crítico | `#F25F5C` |

Tipografías: **Cormorant SC** (títulos), **EB Garamond** (secundaria — sustituye
a la "Garamont" del manual, que no está en Google Fonts), **Lato** (cuerpo).

## Puesta en marcha

```bash
cd frontend
npm install
npx expo start
```

> Si `npm install` advierte versiones, ejecuta `npm run fix-deps`
> (`expo install --fix`) para alinear las dependencias con el SDK de Expo.

### Conectar con el backend

1. Levanta el backend: `python manage.py runserver` (puerto 8000).
2. Edita `src/config.js` y coloca la **IP local de tu PC** en `API_BASE_URL`
   (ej. `http://192.168.1.50:8000/api`), o crea `frontend/.env`:

   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.50:8000/api
   ```

3. En el teléfono usa la app **Expo Go** escaneando el QR.

`localhost` solo funciona en el emulador web; en un dispositivo físico debe
ser la IP de la misma red Wi-Fi.

## Estructura

```
src/
  config.js          # API_BASE_URL + URL del WebSocket
  theme/             # Colores y tipografías de marca
  utils/rut.js       # Validación/formateo RUT (mismo algoritmo que el backend)
  services/          # axios + JWT (interceptor, refresh) y servicios REST
  context/           # AuthContext (sesión) y NotificationContext (WebSocket)
  navigation/        # Navegación con stacks por rol
  components/        # UI de marca (botones, tarjetas, KPI cards…)
  screens/           # Login, Panel KPIs, Usuarios, Tareas, Incidencias,
                     # Habitaciones, Perfil, Notificaciones
```

## Roles y navegación

- **ADMINISTRADOR**: Panel de KPIs, Habitaciones, Incidencias, Usuarios, Perfil.
- **OPERARIO**: Tareas, Incidencias, Perfil.
- **RECEPCIÓN**: Habitaciones, Incidencias, Tareas, Perfil.

## Contratos usados (backend verificado)

- `POST api/auth/login/` `{rut, password}` → `{access, refresh, user}`
- `POST api/auth/refresh/` · `POST api/auth/logout/` · `GET api/auth/perfil/`
- `GET api/core/kpis/` → `{kpis: [KPI1..KPI5]}` (solo ADMINISTRADOR)
- `api/users/usuarios` (CRUD admin) · `api/users/roles` · `api/users/areas`
- WebSocket: `ws://<host>:8000/ws/notifications/<user_id>/`

Los servicios de `tasks`, `incidents`, `rooms` y `evidence` siguen los
contratos del informe; se ajustarán fino a fino cuando se terminen esas apps
del backend.
