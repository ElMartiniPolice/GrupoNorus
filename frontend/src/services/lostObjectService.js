import api from './api';

/**
 * Objetos perdidos — api/lostobjects/ (con imagen adjunta).
 * ObjetoPerdido {id, titulo, descripcion, categoria, sede, habitacion,
 * ubicacion, estado, imagen, reportado_por, entregado_a, encontrado_en,
 * entregado_en}. Estados: EN_RESGUARDO / ENTREGADO / DESCARTADO.
 */
function buildForm(payload) {
  const { imagen, ...rest } = payload;
  const form = new FormData();
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      form.append(key, String(value));
    }
  });
  if (imagen?.uri) {
    form.append('imagen', {
      uri: imagen.uri,
      type: imagen.type || 'image/jpeg',
      name: imagen.name || `objeto_${Date.now()}.jpg`,
    });
  }
  return form;
}

export const lostObjectService = {
  async list(params = {}) {
    const { data } = await api.get('/lostobjects/objetos/', { params });
    return data.results ?? data;
  },
  async get(id) {
    const { data } = await api.get(`/lostobjects/objetos/${id}/`);
    return data;
  },
  async create(payload) {
    if (payload.imagen?.uri) {
      const { data } = await api.post('/lostobjects/objetos/', buildForm(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.post('/lostobjects/objetos/', payload);
    return data;
  },
  async update(id, payload) {
    if (payload.imagen?.uri) {
      const { data } = await api.patch(`/lostobjects/objetos/${id}/`, buildForm(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.patch(`/lostobjects/objetos/${id}/`, payload);
    return data;
  },
  async adjuntarImagen(id, photo) {
    const form = new FormData();
    form.append('imagen', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || `objeto_${Date.now()}.jpg`,
    });
    const { data } = await api.patch(`/lostobjects/objetos/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async entregar(id, entregadoA) {
    const { data } = await api.post(`/lostobjects/objetos/${id}/entregar/`, {
      entregado_a: entregadoA,
    });
    return data;
  },
  async descartar(id) {
    const { data } = await api.post(`/lostobjects/objetos/${id}/descartar/`);
    return data;
  },
};
