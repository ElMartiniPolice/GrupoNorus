import api from './api';

/**
 * Tareas — api/tasks/ (CU2/CU5/CU6/CU9).
 * Contrato según informe: AsignacionTarea {id, titulo, descripcion,
 * habitacion, asignado_a, prioridad, estado, creada_en}, con historial
 * de estados (HistorialEstadoTarea).
 */
export const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
export const ESTADOS_TAREA = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'];

export const taskService = {
  async list(params = {}) {
    const { data } = await api.get('/tasks/tareas/', { params });
    return data.results ?? data;
  },
  async mias(params = {}) {
    const { data } = await api.get('/tasks/tareas/', { params: { ...params, mias: true } });
    return data.results ?? data;
  },
  async get(id) {
    const { data } = await api.get(`/tasks/tareas/${id}/`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post('/tasks/tareas/', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/tasks/tareas/${id}/`, payload);
    return data;
  },
  async cambiarEstado(id, estado) {
    const { data } = await api.patch(`/tasks/tareas/${id}/`, { estado });
    return data;
  },
  /** CU9 — Validar tarea completada (RECEPCION / ADMINISTRADOR). */
  async validar(id) {
    const { data } = await api.post(`/tasks/tareas/${id}/validar/`);
    return data;
  },
  async historial(id) {
    const { data } = await api.get(`/tasks/tareas/${id}/historial/`);
    return data.results ?? data;
  },
};
