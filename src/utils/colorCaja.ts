// Color por caja para el rediseño "Sereno": el modelo Caja no guarda color,
// así que se deriva del orden/índice rotando una paleta con su tinte claro.
// Uso: avatar (tinte + inicial en color) y barra de progreso (color pleno).

export interface ParCaja {
  /** Color pleno: barra de progreso, inicial del avatar. */
  color: string;
  /** Tinte claro: fondo del avatar y de pills. */
  tint: string;
}

/** Paleta rotativa. Los 3 primeros coinciden con el mockup (Básico/Ahorros/Emergencia). */
export const paletaCajas: ParCaja[] = [
  { color: '#1a73e8', tint: '#cfe0fc' }, // primary (azul)
  { color: '#2e7d32', tint: '#e6f4ea' }, // success (verde)
  { color: '#d32f2f', tint: '#fdecea' }, // error (rojo)
  { color: '#7e57c2', tint: '#ede7f6' }, // púrpura
  { color: '#00897b', tint: '#e0f2f1' }, // teal
  { color: '#f57c00', tint: '#fff3e0' }, // naranja
];

/** Devuelve el par de color/tinte para una caja según su índice de orden. */
export function colorCaja(index: number): ParCaja {
  const i = ((index % paletaCajas.length) + paletaCajas.length) % paletaCajas.length;
  return paletaCajas[i];
}

/** Inicial en mayúscula de un nombre (para avatares). Vacío → '?'. */
export function inicial(nombre: string): string {
  const t = (nombre ?? '').trim();
  return t ? t.charAt(0).toUpperCase() : '?';
}
