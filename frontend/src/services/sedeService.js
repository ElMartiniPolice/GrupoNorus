import api from './api';

/**
 * Sedes — api/sedes/ (especificación por sede).
 * Sede {id, nombre, direccion, activo, creado_en}.
 */
export const sedeService = {
  async list(params = {}) {
    const { data } = await api.get('/sedes/sedes/', { params });
    return data.results ?? data;
  },
  async get(id) {
    const { data } = await api.get(`/sedes/sedes/${id}/`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post('/sedes/sedes/', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/sedes/sedes/${id}/`, payload);
    return data;
  },
};
