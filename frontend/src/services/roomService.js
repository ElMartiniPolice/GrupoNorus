import api from './api';

/**
 * Habitaciones — api/rooms/ (CU1/CU3/CU10, CP-HAB-01).
 * Contrato según informe: Habitacion {id, numero, tipo, estado},
 * TipoHabitacion {id, nombre}, RegistroEstadia {id, habitacion,
 * huesped, llegada, salida, conflicto}.
 */
export const roomService = {
  async list(params = {}) {
    const { data } = await api.get('/rooms/habitaciones/', { params });
    return data.results ?? data;
  },
  async get(id) {
    const { data } = await api.get(`/rooms/habitaciones/${id}/`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post('/rooms/habitaciones/', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/rooms/habitaciones/${id}/`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/rooms/habitaciones/${id}/`);
  },
  async tipos() {
    const { data } = await api.get('/rooms/tipos/');
    return data.results ?? data;
  },
  /** Registros de estadía — detección de conflictos (CU10). */
  async estadias(params = {}) {
    const { data } = await api.get('/rooms/estadias/', { params });
    return data.results ?? data;
  },
  async crearEstadia(payload) {
    const { data } = await api.post('/rooms/estadias/', payload);
    return data;
  },
  /** CU1 — Check-out: cierra la estadía activa (backend actualiza la habitación). */
  async checkout(estadiaId) {
    const { data } = await api.post(`/rooms/estadias/${estadiaId}/checkout/`);
    return data;
  },
  /**
   * Cambio de estado con fotografía opcional (CP-HAB-01).
   * El backend registra el cambio (estado anterior/nuevo, foto, responsable).
   */
  async cambiarEstado(id, estado, photo) {
    const form = new FormData();
    form.append('estado', String(estado));
    if (photo) {
      form.append('imagen', {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.name || `cambio_estado_${Date.now()}.jpg`,
      });
    }
    const { data } = await api.post(
      `/rooms/habitaciones/${id}/cambiar_estado/`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
  /** Historial de cambios de estado de una habitación. */
  async cambiosEstado(habitacionId) {
    const { data } = await api.get(`/rooms/habitaciones/${habitacionId}/cambios_estado/`);
    return data.results ?? data;
  },
  /** Historial global de cambios de estado (solo ADMINISTRADOR). */
  async historialCambios(params = {}) {
    const { data } = await api.get('/rooms/cambios-estado/', { params });
    return data.results ?? data;
  },
};
