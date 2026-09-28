/**
 * Utilidades de RUT — espejo de backend/apps/utils/rut.py
 * (normaliza, módulo 11, DV {11: '0', 10: 'K'}).
 */

/** RUT solo con dígitos y DV (K), sin puntos ni guion. */
export function cleanRut(rut) {
  return (rut || '').toString().toUpperCase().replace(/[^0-9K]/g, '');
}

/** Valida RUT chileno con módulo 11. */
export function validarRut(rut) {
  const clean = cleanRut(rut);
  if (clean.length < 7 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let suma = 0;
  let multiplo = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === dvEsperado;
}

/** Formatea a 12.345.678-9 mientras se escribe. */
export function formatearRut(rut) {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${dv}`;
}

/** Normaliza al formato almacenado en el backend: 12345678-9 (sin puntos). */
export function normalizarRut(rut) {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}
