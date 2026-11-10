/**
 * checklistTypes.js — Tipos de checklist por área y tipo de habitación.
 * HU-10: Checklist para mucama según tipo de habitación.
 * HU-11: Checklist requisito antes de pasar habitación a "disponible".
 * HU-12: Checklists propios de cada área (recepción, mantención).
 */

/** HU-10: Checklists por tipo de habitación */
const CHECKLISTS_HABITACION = {
  /** Habitación estándar */
  ESTANDAR: [
    { id: 'h1', label: 'Quitar ropa sucia', completed: false },
    { id: 'h2', label: 'Hacer cama', completed: false },
    { id: 'h3', label: 'Limpiar baño (bañera, inodoro, lavamanos)', completed: false },
    { id: 'h4', label: 'Limpieza suelos', completed: false },
    { id: 'h5', label: 'Reponer toallas y amenidades', completed: false },
  ],
  /** Habitación suite */
  SUITE: [
    { id: 's1', label: 'Quitar ropa sucia', completed: false },
    { id: 's2', label: 'Hacer cama con cambio de sábanas', completed: false },
    { id: 's3', label: 'Limpiar baño y áreas de hidromasaje', completed: false },
    { id: 's4', label: 'Limpieza suelos y alfombras', completed: false },
    { id: 's5', label: 'Reponer minibar y amenidades premium', completed: false },
    { id: 's6', label: 'Inspeccionar equipo de entretenimiento', completed: false },
  ],
  /** Habitación simple */
  SIMPLE: [
    { id: 'si1', label: 'Quitar ropa sucia', completed: false },
    { id: 'si2', label: 'Hacer cama', completed: false },
    { id: 'si3', label: 'Limpiar baño', completed: false },
    { id: 'si4', label: 'Limpieza suelos', completed: false },
  ],
};

/** HU-12: Checklists por área */
const CHECKLISTS_AREA = {
  RECEPCION: [
    { id: 'r1', label: 'Verificar estado de registro de huéspedes', completed: false },
    { id: 'r2', label: 'Confirmar disponibilidad de llaves', completed: false },
    { id: 'r3', label: 'Revisar estado de áreas comunes', completed: false },
    { id: 'r4', label: 'Verificar funcionamiento de equipos', completed: false },
  ],
  MANTENIMIENTO: [
    { id: 'm1', label: 'Inspeccionar instalaciones eléctricas', completed: false },
    { id: 'm2', label: 'Verificar sistemas de climatización', completed: false },
    { id: 'm3', label: 'Revisar estado de fontanería', completed: false },
    { id: 'm4', label: 'Inspeccionar equipos de seguridad', completed: false },
  ],
};

/** HU-11: Validación de checklist antes de cambiar estado a DISPONIBLE */
const CHECKLIST_REQUERIDO_PARA_DISPONIBLE = {
  /** Habitaciones que requieren checklist completo antes de DISPONIBLE */
  requiereChecklist: ['ESTANDAR', 'SUITE', 'SIMPLE'],
  /** Áreas que tienen checklists propios */
  areasConChecklist: ['RECEPCION', 'MANTENIMIENTO'],
};

/** Obtener checklist para un tipo de habitación */
export function getChecklistHabitacion(tipo) {
  return CHECKLISTS_HABITACION[tipo] || CHECKLISTS_HABITACION.ESTANDAR;
}

/** Obtener checklist para un área */
export function getChecklistArea(area) {
  return CHECKLISTS_AREA[area] || [];
}

/** Verificar si un tipo de habitación requiere checklist para estar disponible */
export function requiereChecklistParaDisponible(tipo) {
  return CHECKLIST_REQUERIDO_PARA_DISPONIBLE.requiereChecklist.includes(tipo);
}

/** Verificar si un área tiene checklist propio */
export function areaTieneChecklist(area) {
  return CHECKLIST_REQUERIDO_PARA_DISPONIBLE.areasConChecklist.includes(area);
}

/** Estado inicial del checklist (todas incomplete) */
export function crearEstadoChecklist(items) {
  return items.map((item) => ({ ...item, completed: false }));
}

/** Alternar estado de un ítem del checklist */
export function toggleChecklistItem(estado, itemId) {
  return estado.map((item) =>
    item.id === itemId ? { ...item, completed: !item.completed } : item,
  );
}

/** Verificar si todos los items del checklist están completados */
export function todosCompletados(estado) {
  return estado.every((item) => item.completed);
}

export default {
  CHECKLISTS_HABITACION,
  CHECKLISTS_AREA,
  CHECKLIST_REQUERIDO_PARA_DISPONIBLE,
  getChecklistHabitacion,
  getChecklistArea,
  requiereChecklistParaDisponible,
  areaTieneChecklist,
  crearEstadoChecklist,
  toggleChecklistItem,
  todosCompletados,
};