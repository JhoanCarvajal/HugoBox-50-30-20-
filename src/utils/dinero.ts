// El dinero se representa SIEMPRE como centavos enteros. $100.01 = 10001.

/** Unidades monetarias (posible decimal del usuario) → centavos enteros. */
export function aCentavos(unidades: number): number {
  return Math.round(unidades * 100);
}

/** Centavos enteros → unidades monetarias. */
export function aUnidades(centavos: number): number {
  return centavos / 100;
}

/**
 * Formatea un monto en centavos como moneda: prefijo `$`, coma para miles y punto para
 * decimales (siempre 2), consistente con el campo de captura (MoneyInput). Solo COP.
 */
export function formatearMoneda(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const abs = Math.abs(centavos);
  const canonico = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return `${signo}$${formatearEntrada(canonico, { blur: true })}`;
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

/**
 * Sanea una entrada/pegado del usuario a la cadena canónica del monto:
 * dígitos + punto decimal opcional + máx. 2 decimales, sin separadores de miles.
 * Convención del campo: coma = miles, punto = decimales.
 * - Si hay ambos separadores, el de más a la derecha es el decimal.
 * - Si solo hay puntos, el último punto es el decimal (permite teclear en vivo).
 * - Si solo hay comas, son miles y se descartan.
 * Devuelve '' si no hay ningún carácter aprovechable.
 */
export function sanitizarMonto(entrada: string): string {
  const limpio = entrada.replace(/[^\d.,]/g, '');
  if (limpio === '') return '';

  const tienePunto = limpio.includes('.');
  const tieneComa = limpio.includes(',');

  let entero: string;
  let decimal = '';
  let hayDecimal = false;

  if (tienePunto && tieneComa) {
    const idx = Math.max(limpio.lastIndexOf('.'), limpio.lastIndexOf(','));
    entero = limpio.slice(0, idx).replace(/[.,]/g, '');
    decimal = limpio.slice(idx + 1).replace(/[^\d]/g, '');
    hayDecimal = true;
  } else if (tienePunto) {
    const idx = limpio.lastIndexOf('.');
    entero = limpio.slice(0, idx).replace(/\./g, '');
    decimal = limpio.slice(idx + 1).replace(/\./g, '');
    hayDecimal = true;
  } else if (tieneComa) {
    entero = limpio.replace(/,/g, '');
  } else {
    entero = limpio;
  }

  entero = entero.replace(/^0+(?=\d)/, '');
  if (entero === '') entero = '0';
  decimal = decimal.slice(0, 2);

  return hayDecimal ? `${entero}.${decimal}` : entero;
}

/**
 * Formatea la cadena canónica para mostrarla: agrupa miles con coma y usa punto decimal.
 * Con `blur: true` fuerza exactamente 2 decimales (formato financiero completo).
 */
export function formatearEntrada(canonico: string, opts: { blur?: boolean } = {}): string {
  if (canonico === '') return '';
  const hayDecimal = canonico.includes('.');
  const [entero, decimal = ''] = canonico.split('.');
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (opts.blur) {
    return `${agrupado}.${(decimal + '00').slice(0, 2)}`;
  }
  return hayDecimal ? `${agrupado}.${decimal}` : agrupado;
}

/** Cuenta caracteres significativos (dígitos y punto) a la izquierda de `hasta`. */
function contarSignificativos(texto: string, hasta: number): number {
  let n = 0;
  for (let i = 0; i < hasta && i < texto.length; i++) {
    if (/[\d.]/.test(texto[i])) n++;
  }
  return n;
}

/** Índice en `display` tras `objetivo` caracteres significativos (para reubicar el cursor). */
function indiceTrasSignificativos(display: string, objetivo: number): number {
  let idx = 0;
  let contados = 0;
  while (idx < display.length && contados < objetivo) {
    if (/[\d.]/.test(display[idx])) contados++;
    idx++;
  }
  return idx;
}

/**
 * Localiza el punto de edición comparando el texto mostrado previo con el entrante:
 * devuelve el índice en `nuevo` justo tras la región modificada (fin de lo insertado
 * o punto del borrado). Evita depender del `selection` nativo, que llega desfasado en
 * `onChangeText` (condición de carrera con `onSelectionChange`).
 */
function posicionEdicion(previo: string, nuevo: string): number {
  const min = Math.min(previo.length, nuevo.length);
  let prefijo = 0;
  while (prefijo < min && previo[prefijo] === nuevo[prefijo]) prefijo++;
  let sufijo = 0;
  while (
    sufijo < min - prefijo &&
    previo[previo.length - 1 - sufijo] === nuevo[nuevo.length - 1 - sufijo]
  ) {
    sufijo++;
  }
  return nuevo.length - sufijo;
}

/**
 * Dado el texto mostrado antes (`previo`) y el texto que llega del campo (`nuevo`),
 * calcula el valor canónico, el texto a mostrar y dónde debe quedar el cursor tras
 * reformatear. El cursor se preserva por conteo de caracteres significativos (dígitos
 * y punto), de modo que insertar/quitar separadores de miles no lo desplaza.
 */
export function calcularCambioMonto(
  previo: string,
  nuevo: string,
): { canonico: string; display: string; cursor: number } {
  const posEdicion = posicionEdicion(previo, nuevo);
  const significativosIzq = contarSignificativos(nuevo, posEdicion);
  const canonico = sanitizarMonto(nuevo);
  const display = canonico === '' ? '' : formatearEntrada(canonico, { blur: false });
  const cursor = indiceTrasSignificativos(display, significativosIzq);
  return { canonico, display, cursor };
}
