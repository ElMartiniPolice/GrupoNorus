import api from './api';

/**
 * Usuarios / Roles / Áreas — routers verificados:
 *  api/users/usuarios  (CRUD solo admin, CP-USR-01)
 *  api/users/roles     (solo lectura)
 *  api/users/areas     (solo lectura)
 * DRF pagination 20 → {count, results} en listados.
 */
export const userService = {
  async list(params = {}) {
    const { data } = await api.get('/users/usuarios/', { params });
    return data.results ?? data;
  },
  async get(id) {
    const { data } = await api.get(`/users/usuarios/${id}/`);
    return data;
  },
  /** payload: {rut, nombre, apellido, telefono, rol, area, password} */
  async create(payload) {
    const { data } = await api.post('/users/usuarios/', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/users/usuarios/${id}/`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/users/usuarios/${id}/`);
  },
  async roles() {
    const { data } = await api.get('/users/roles/');
    return data.results ?? data;
  },
  async areas() {
    const { data } = await api.get('/users/areas/');
    return data.results ?? data;
  },
};
