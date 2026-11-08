import { API_BASE_URL } from '../config';

/**
 * Resuelve una URL de imagen proveniente del backend.
 * Si es una ruta relativa local de Django (ej: '/media/evidencias/...'),
 * le antepone la base del backend HTTP (ej: 'http://localhost:8000').
 * Si ya es una URL absoluta (S3, https, blob o data URI), la mantiene intacta.
 */
export function resolveMediaUrl(raw) {
  if (!raw) return null;
  const str =
    typeof raw === 'string'
      ? raw
      : raw.url || raw.uri || raw.image || raw.archivo || raw.foto || null;

  if (!str || typeof str !== 'string') return null;

  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('data:') ||
    str.startsWith('blob:')
  ) {
    return str;
  }

  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${base}${str.startsWith('/') ? '' : '/'}${str}`;
}

