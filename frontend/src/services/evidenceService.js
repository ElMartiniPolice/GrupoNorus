import api from './api';

/**
 * Evidencias — api/evidence/ (CP-FOT-01, CP-DP-05).
 * El backend sube a S3 (bucket gruponorus-evidencias, us-east-1);
 * el frontend envía multipart/form-data con la imagen.
 */
export const evidenceService = {
  async list(params = {}) {
    const { data } = await api.get('/evidence/evidencias/', { params });
    return data.results ?? data;
  },
  async porIncidencia(incidenciaId) {
    const { data } = await api.get('/evidence/evidencias/', {
      params: { incidencia: incidenciaId },
    });
    return data.results ?? data;
  },
  /**
   * Registro fotográfico de una habitación (CP-DP-02).
   * @param {number} habitacionId
   */
  async porHabitacion(habitacionId) {
    const { data } = await api.get('/evidence/evidencias/', {
      params: { habitacion: habitacionId },
    });
    return data.results ?? data;
  },
  /**
   * Sube una foto (resultado de expo-image-picker).
   * @param {number} incidenciaId
   * @param {object} photo {uri, type='image/jpeg', name}
   */
  async subir(incidenciaId, photo) {
    const form = new FormData();
    form.append('incidencia', String(incidenciaId));
    form.append('imagen', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || `evidencia_${Date.now()}.jpg`,
    });
    const { data } = await api.post('/evidence/evidencias/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
