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

/**
 * Convierte el texto de un monto (tal como lo escribe el usuario) a número,
 * soportando el separador de miles latino ('.' o ',') además del decimal.
 *
 * Regla: el separador ('.' o ',') más a la derecha se interpreta como
 * decimal SOLO si le siguen exactamente 1 o 2 dígitos hasta el final de la
 * cadena (p.ej. "100,50" o "1.234,56"); en ese caso, cualquier otro
 * separador anterior se asume de miles y se descarta. Si el último
 * separador no cumple eso (0 dígitos después, o 3+ como en "1.000"),
 * NINGÚN separador es decimal: todos se eliminan por ser de miles.
 * Devuelve NaN si el resultado no es un número válido.
 */
export function parsearMonto(entrada: string): number {
  const limpio = entrada.replace(/\s+/g, '');
  const ultimoIdx = Math.max(limpio.lastIndexOf('.'), limpio.lastIndexOf(','));
  if (ultimoIdx === -1) {
    return Number(limpio);
  }
  const despuesDelUltimo = limpio.slice(ultimoIdx + 1);
  const esDecimal = /^\d{1,2}$/.test(despuesDelUltimo);
  if (esDecimal) {
    const parteEntera = limpio.slice(0, ultimoIdx).replace(/[.,]/g, '');
    return Number(`${parteEntera}.${despuesDelUltimo}`);
  }
  return Number(limpio.replace(/[.,]/g, ''));
}
