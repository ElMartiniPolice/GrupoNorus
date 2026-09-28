import api, { storage, apiErrorMessage } from './api';

/**
 * Autenticación — contrato verificado del backend:
 *  POST api/auth/login/  {rut, password}
 *    → 200 {access, refresh, user:{id, rut, nombre, apellido, telefono,
 *            rol, rol_nombre, area, area_nombre, is_active, ultimo_acceso}}
 *    → 401 {detail: 'Credenciales inválidas.'}
 *    → 423 {detail: 'Cuenta bloqueada temporalmente por intentos fallidos...'}
 */
export const authService = {
  async login(rut, password) {
    const clean = (rut || '').toUpperCase().trim();
    try {
      const { data } = await api.post('/auth/login/', { rut: clean, password });
      await storage.saveSession(data);
      return { ok: true, user: data.user };
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) };
    }
  },

  /** POST api/auth/logout/ {refresh} → {detail: 'Sesión cerrada.'} */
  async logout() {
    try {
      const { refresh } = await storage.getTokens();
      if (refresh) await api.post('/auth/logout/', { refresh });
    } catch {
      // El logout nunca debe bloquear la salida local.
    } finally {
      await storage.clear();
    }
  },

  /** GET api/auth/perfil/ → UsuarioSerializer */
  async perfil() {
    const { data } = await api.get('/auth/perfil/');
    return data;
  },
};
