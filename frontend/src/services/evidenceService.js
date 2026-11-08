import { Platform } from 'react-native';
import api from './api';

async function buildFormData(fields, photo, defaultPrefix = 'evidencia') {
  const form = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined && val !== null) {
      form.append(key, String(val));
    }
  }

  if (photo) {
    let filename = photo.name || photo.fileName || `${defaultPrefix}_${Date.now()}.jpg`;
    if (!filename.includes('.')) {
      filename = `${filename}.jpg`;
    }
    let mime = photo.mimeType || photo.type || 'image/jpeg';
    if (!mime || mime === 'image' || !mime.includes('/')) {
      mime = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    }

    if (Platform.OS === 'web') {
      if (photo.file instanceof Blob) {
        form.append('imagen', photo.file, filename);
      } else if (photo.uri) {
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: mime || blob.type || 'image/jpeg' });
        form.append('imagen', file, filename);
      }
    } else {
      form.append('imagen', {
        uri: photo.uri,
        type: mime,
        name: filename,
      });
    }
  }

  return form;
}

/**
 * Evidencias — api/evidence/ (CP-FOT-01, CP-DP-05).
 * El backend sube a S3 o almacenamiento local;
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
   * @param {object} photo {uri, type='image/jpeg', name, file}
   */
  async subir(incidenciaId, photo) {
    const form = await buildFormData({ incidencia: incidenciaId }, photo, 'evidencia');
    const { data } = await api.post('/evidence/evidencias/', form);
    return data;
  },

  /**
   * Sube una foto para una tarea.
   * @param {number} tareaId
   * @param {object} photo {uri, type='image/jpeg', name, file}
   */
  async subirTarea(tareaId, photo) {
    const form = await buildFormData({ tarea: tareaId }, photo, 'tarea');
    const { data } = await api.post('/evidence/evidencias/', form);
    return data;
  },

  /**
   * Obtiene evidencias de una tarea.
   * @param {number} tareaId
   */
  async porTarea(tareaId) {
    const { data } = await api.get('/evidence/evidencias/', {
      params: { tarea: tareaId },
    });
    return data.results ?? data;
  },
};
