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

export function userDetalleLabel(u) {
  if (!u || typeof u !== 'object') return userLabel(u);
  const name = userLabel(u);
  const parts = [];
  if (u.rol_nombre) parts.push(u.rol_nombre);
  if (u.area_nombre) parts.push(u.area_nombre);
  return parts.length ? `${name} (${parts.join(' · ')})` : name;
}

export function estadoLabel(e) {
  return String(e ?? '').replace(/_/g, ' ');
}
