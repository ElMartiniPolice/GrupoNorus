import api from './api';

/**
 * Inventario — api/inventory/ (por sede/habitación).
 * InventarioItem {id, nombre, categoria, sede, habitacion, cantidad,
 * stock_minimo, notas, actualizado_por, actualizado_en, creado_en}.
 */
export const inventoryService = {
  async list(params = {}) {
    const { data } = await api.get('/inventory/items/', { params });
    return data.results ?? data;
  },
  async get(id) {
    const { data } = await api.get(`/inventory/items/${id}/`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post('/inventory/items/', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/inventory/items/${id}/`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/inventory/items/${id}/`);
  },
};
