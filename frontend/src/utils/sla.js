/**
 * sla.js — Umbrales de respuesta/resolución por severidad (README, tabla SLA).
 */
export const SLA = {
  CRITICO: { respuesta: 'Inmediata', resolucion: '30 min' },
  ALTO: { respuesta: '10 min', resolucion: '2 h' },
  MEDIO: { respuesta: '30 min', resolucion: '8 h (mismo turno)' },
  BAJO: { respuesta: '2 h', resolucion: '24 h' },
};

export function slaText(severidad) {
  const s = SLA[severidad];
  if (!s) return '';
  return `Respuesta: ${s.respuesta} · Resolución: ${s.resolucion}`;
}
