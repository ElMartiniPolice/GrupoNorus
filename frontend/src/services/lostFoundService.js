import { Platform } from 'react-native';
import api from './api';

async function buildFormData(fields, photo) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value));
  });

  if (photo) {
    const filename = photo.name || photo.fileName || `objeto_${Date.now()}.jpg`;
    const type = photo.mimeType || photo.type || 'image/jpeg';
    if (Platform.OS === 'web') {
      if (photo.file instanceof Blob) {
        form.append('imagen', photo.file, filename);
      } else if (photo.uri) {
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        form.append('imagen', new File([blob], filename, { type }));
      }
    } else {
      form.append('imagen', { uri: photo.uri, type, name: filename });
    }
  }
  return form;
}

export const lostFoundService = {
  async list() {
    const { data } = await api.get('/evidence/objetos-perdidos/');
    return data.results ?? data;
  },
  async crear(fields, photo) {
    const form = await buildFormData(fields, photo);
    const { data } = await api.post('/evidence/objetos-perdidos/', form);
    return data;
  },
};