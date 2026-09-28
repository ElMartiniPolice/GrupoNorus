/**
 * Tema NORUS — extraído del Manual de Marca.
 *  - Paleta principal (pág. 4): #0B3C5D, #B3CDE0, #FFFFFF, #ECECEC, #328CC1
 *  - Paleta secundaria (pág. 5): #FFC858, #F25F5C
 *  - Tipografías (pág. 6): Cormorant SC (principal),
 *    Garamond → sustituida por EB Garamond (secundaria), Lato (terciaria).
 */

export const colors = {
  primary: '#0B3C5D', // Azul oscuro — headers, navegación, títulos
  primaryLight: '#328CC1', // Azul medio — acentos, acciones, éxito
  primarySoft: '#B3CDE0', // Azul claro — badges, fondos suaves
  white: '#FFFFFF',
  surface: '#ECECEC', // Gris claro — fondo de pantallas
  gold: '#FFC858', // Dorado — destacados, advertencias, pendiente
  coral: '#F25F5C', // Rojo coral — errores, crítico
  text: '#0B3C5D',
  textMuted: '#6B7A87',
  border: '#ECECEC',
  overlay: 'rgba(11, 60, 93, 0.55)',
};

export const fonts = {
  title: 'CormorantSC_700Bold',
  titleAlt: 'CormorantSC_600SemiBold',
  serif: 'EBGaramond_600SemiBold',
  serifRegular: 'EBGaramond_400Regular',
  body: 'Lato_400Regular',
  bodyBold: 'Lato_700Bold',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };

/** Colores por severidad / prioridad (SLA del informe). */
export const severityColor = {
  CRITICO: colors.coral,
  ALTO: colors.gold,
  MEDIO: colors.primaryLight,
  BAJO: colors.primarySoft,
};

/** Colores por estado de tarea (contrato: PENDIENTE/EN_PROGRESO/COMPLETADA/CANCELADA). */
export const taskEstadoColor = {
  PENDIENTE: colors.gold,
  EN_PROGRESO: colors.primaryLight,
  COMPLETADA: colors.primary,
  CANCELADA: colors.textMuted,
};

/** Colores por prioridad de tarea (femenino — contrato tasks). */
export const prioridadColor = {
  CRITICA: colors.coral,
  ALTA: colors.gold,
  MEDIA: colors.primaryLight,
  BAJA: colors.primarySoft,
};

/** Colores por estado de habitación. */
export const roomEstadoColor = {
  DISPONIBLE: colors.primaryLight,
  OCUPADA: colors.gold,
  LIMPIEZA: colors.primarySoft,
  MANTENCION: colors.coral,
};
