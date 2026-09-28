/**
 * Configuración de entorno — Grupo Norus.
 *
 * IMPORTANTE: en un dispositivo físico "localhost" no funciona.
 * Coloca la IP local del PC donde corre Django, por ejemplo:
 *   http://192.168.1.50:8000/api
 *
 * Alternativa (Expo SDK 49+): crea frontend/.env con
 *   EXPO_PUBLIC_API_URL=http://192.168.1.50:8000/api
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

/** Base WS derivada de la base HTTP (http→ws, sin el sufijo /api). */
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '');

/** Canal de notificaciones en tiempo real (CP-ALE-01). */
export const wsNotificationsUrl = (userId) =>
  `${WS_BASE_URL}/ws/notifications/${userId}/`;

export const BRAND_NAME = 'NORUS';
export const BRAND_TAGLINE = 'APARTMENTS';
