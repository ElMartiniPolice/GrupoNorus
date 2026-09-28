import api from './api';

/**
 * Notificaciones — api/notifications/ (CP-ALE-01).
 * Además existe el canal WebSocket /ws/notifications/<user_id>/
 * (ver src/services/socket.js) para alertas en tiempo real.
 */
export const notificationService = {
  async list(params = {}) {
    const { data } = await api.get('/notifications/notificaciones/', { params });
    return data.results ?? data;
  },
  async noLeidas() {
    const { data } = await api.get('/notifications/notificaciones/', {
      params: { leida: false },
    });
    return data.results ?? data;
  },
  async marcarLeida(id) {
    const { data } = await api.patch(`/notifications/notificaciones/${id}/`, {
      leida: true,
    });
    return data;
  },
  async marcarTodas() {
    const { data } = await api.post('/notifications/notificaciones/marcar_todas/');
    return data;
  },
};
