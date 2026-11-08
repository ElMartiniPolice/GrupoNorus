import { Platform } from 'react-native';
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
      if (Platform.OS === 'web') {
        if (photo.file instanceof Blob) {
          form.append('imagen', photo.file, photo.name || photo.fileName || `cambio_${Date.now()}.jpg`);
        } else {
          const res = await fetch(photo.uri);
          const blob = await res.blob();
          const file = new File([blob], photo.name || photo.fileName || `cambio_${Date.now()}.jpg`, {
            type: photo.mimeType || photo.type || blob.type || 'image/jpeg',
          });
          form.append('imagen', file);
        }
      } else {
        form.append('imagen', {
          uri: photo.uri,
          type: photo.mimeType || photo.type || 'image/jpeg',
          name: photo.name || photo.fileName || `cambio_estado_${Date.now()}.jpg`,
        });
      }
    }
    const headers = Platform.OS === 'web' ? { 'Content-Type': undefined } : { 'Content-Type': 'multipart/form-data' };
    const { data } = await api.post(
      `/rooms/habitaciones/${id}/cambiar_estado/`,
      form,
      { headers },
    );
    return data;
  },
  /** Historial de cambios de estado de una habitación. */
  async cambiosEstado(habitacionId) {
    const { data } = await api.get(`/rooms/habitaciones/${habitacionId}/cambios_estado/`);
    return data.results ?? data;
  },
  /** Inventario de la habitación (artículos, faltantes y solicitudes). */
  async inventario(habitacionId) {
    const { data } = await api.get(`/rooms/habitaciones/${habitacionId}/inventario/`);
    return data.results ?? data;
  },
  /** Solicita reposición o marca un ítem como faltante. */
  async solicitarItem(itemId, notas = '') {
    const { data } = await api.post(`/rooms/inventario/${itemId}/solicitar/`, { notas });
    return data;
  },
  /** Marca un ítem solicitado como repuesto (COMPLETO). */
  async reponerItem(itemId) {
    const { data } = await api.post(`/rooms/inventario/${itemId}/reponer/`);
    return data;
  },
  /** Agrega un nuevo ítem al inventario de una habitación. */
  async crearItem(payload) {
    const { data } = await api.post('/rooms/inventario/', payload);
    return data;
  },
  /** Elimina un ítem del inventario. */
  async eliminarItem(itemId) {
    await api.delete(`/rooms/inventario/${itemId}/`);
  },
};
