import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = '@norus_access';
const REFRESH_KEY = '@norus_refresh';
const USER_KEY = '@norus_user';

export const storage = {
  async saveSession({ access, refresh, user }) {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, access],
      [REFRESH_KEY, refresh],
      [USER_KEY, JSON.stringify(user)],
    ]);
  },
  async getTokens() {
    const [access, refresh] = await AsyncStorage.multiGet([TOKEN_KEY, REFRESH_KEY]);
    return { access: access[1], refresh: refresh[1] };
  },
  async getUser() {
    const raw = await AsyncStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async clear() {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  },
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// --- JWT: adjunta el access token a cada petición -------------------------
api.interceptors.request.use(async (config) => {
  const { access } = await storage.getTokens();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// --- Refresh automático en 401 (una sola vez por petición) ----------------
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshing =
          refreshing ||
          (async () => {
            const { refresh } = await storage.getTokens();
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
              refresh,
            });
            await AsyncStorage.setItem('@norus_access', data.access);
            if (data.refresh) {
              await AsyncStorage.setItem('@norus_refresh', data.refresh);
            }
            return data.access;
          })();
        const newAccess = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        await storage.clear();
        return Promise.reject({ ...error, sessionExpired: true });
      }
    }
    return Promise.reject(error);
  }
);

/** Extrae el mensaje de error que envía el backend DRF. */
export function apiErrorMessage(error, fallback = 'Error de conexión con el servidor.') {
  if (error?.sessionExpired) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const first = Object.values(data)[0];
  if (typeof first === 'string') return first;
  if (Array.isArray(first) && first[0]) return String(first[0]);
  return fallback;
}

export default api;
