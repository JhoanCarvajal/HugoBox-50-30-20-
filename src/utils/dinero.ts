// El dinero se representa SIEMPRE como centavos enteros. $100.01 = 10001.

/** Unidades monetarias (posible decimal del usuario) → centavos enteros. */
export function aCentavos(unidades: number): number {
  return Math.round(unidades * 100);
}

/** Centavos enteros → unidades monetarias. */
export function aUnidades(centavos: number): number {
  return centavos / 100;
}

/** Formatea un monto en centavos como moneda. */
export function formatearMoneda(centavos: number, moneda = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(centavos / 100);
}
