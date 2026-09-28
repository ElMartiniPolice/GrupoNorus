/**
 * labels.js — Etiquetas legibles para FK anidadas o IDs crudos del backend.
 * Los serializers pueden devolver objetos ({id, numero, nombre…}) o IDs planos.
 */
export function habLabel(h) {
  if (h === null || h === undefined || h === '') return '—';
  if (typeof h === 'object') return h.numero ?? h.nombre ?? '—';
  return String(h);
}

export function userLabel(u) {
  if (!u) return '—';
  if (typeof u === 'object') {
    const full = [u.nombre, u.apellido].filter(Boolean).join(' ');
    return full || u.rut || '—';
  }
  return String(u);
}

export function estadoLabel(e) {
  return String(e ?? '').replace(/_/g, ' ');
}
