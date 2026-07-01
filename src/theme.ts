/**
 * Design system de HugoBox — tokens centralizados.
 *
 * Extraído de los estilos inline del proyecto y consolidado en una escala
 * coherente (colores semánticos, espaciado base-8, tipografía y radios).
 * Fuente única de verdad para mantener la marca y habilitar futuros temas
 * (p. ej. modo oscuro) sin tocar cada pantalla.
 */

/** Paleta de color. Valores hex verbatim del diseño actual. */
export const colors = {
  /** Azul de marca — botones primarios, enlaces, acentos. */
  primary: '#1a73e8',
  /** Azul claro — fondos de chips/estados seleccionados. */
  primaryLight: '#cfe0fc',
  /** Rojo — errores y acciones destructivas (egresos, saldo negativo). */
  error: '#d32f2f',
  /** Verde — éxito e ingresos. */
  success: '#2e7d32',

  /** Texto por jerarquía, de más a menos énfasis. */
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#888888',
    /** Placeholders y texto deshabilitado. */
    quaternary: '#999999',
  },

  /** Fondo de pantalla. */
  background: '#f4f5f7',
  /** Superficies elevadas (cards, inputs, hojas). */
  surface: '#ffffff',
  /** Borde de inputs y contornos. */
  border: '#cccccc',
  /** Separadores sutiles y fondos neutros. */
  divider: '#eeeeee',

  white: '#ffffff',
} as const;

/** Espaciado en escala base-8 (padding, margin, gap). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Radios de esquina. */
export const radius = {
  sm: 8, // inputs
  md: 12, // cards
  lg: 16, // chips / hojas
  pill: 24, // botones y FAB
} as const;

/** Tipografía: escala de tamaños y pesos. */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const fontWeight = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;

/** Sombras/elevación para superficies (multiplataforma). */
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadows,
} as const;

export type Theme = typeof theme;

export default theme;
