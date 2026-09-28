import api from './api';

/**
 * Incidencias — api/incidents/ (CU8, CP-INC-01/02).
 * Contrato según informe: Incidencia {id, titulo, descripcion, habitacion,
 * severidad, reportado_por, creada_en, atendida_en, requiere_evidencia}.
 * SLA backend (settings): respuesta CRITICO 0 / ALTO 10 / MEDIO 30 / BAJO 120 min;
 * resolución 30 / 120 / 480 / 1440 min.
 * Severidades en masculino (CRITICO/ALTO/MEDIO/BAJO), alineadas con
 * el SLA del informe, el backend y theme.severityColor.
 */
export const SEVERIDADES = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO'];

export const incidentService = {
  async list(params = {}) {
    const { data } = await api.get('/incidents/incidencias/', { params });
    return data.results ?? data;
  },
  async get(id) {
    const { data } = await api.get(`/incidents/incidencias/${id}/`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post('/incidents/incidencias/', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/incidents/incidencias/${id}/`, payload);
    return data;
  },
  async atender(id) {
    const { data } = await api.post(`/incidents/incidencias/${id}/atender/`);
    return data;
  },
  async resolver(id, payload = {}) {
    const { data } = await api.post(`/incidents/incidencias/${id}/resolver/`, payload);
    return data;
  },
};
