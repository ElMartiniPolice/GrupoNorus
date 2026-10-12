/**
 * Helpers para resolver URLs de imagen servidas por el backend.
 * Con FileSystemStorage el serializer devuelve rutas relativas (/media/...);
 * con almacenamiento S3 devuelve URLs absolutas. RN Image requiere URI absoluta.
 */
import { API_BASE_URL } from '../config';

const SERVER_ROOT = API_BASE_URL.replace(/\/api\/?$/, '');

export function imagenUri(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SERVER_ROOT}${path}`;
}
