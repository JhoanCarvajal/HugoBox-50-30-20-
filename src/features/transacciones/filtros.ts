// Filtrado del historial EN MEMORIA (no en Firestore).
//
// Por qué en memoria: los INGRESOS se guardan con `cajaId: null` porque su
// monto se reparte entre varias cajas (ver `reparto: {cajaId, monto}[]`).
// Filtrar en Firestore con `where('cajaId','==',x)` (como se hacía antes)
// dejaba SIEMPRE fuera a los ingresos, aunque hubieran alimentado esa caja
// (IMP-4: el usuario creía que faltaba dinero). Trayendo todo el historial
// del usuario (volumen bajo en este MVP) y filtrando aquí con una función
// pura, se resuelve ese caso y de paso se puede filtrar por fecha (IMP-3)
// sin depender de índices compuestos en Firestore.

import { Transaccion } from '../../types/models';

export interface FiltroHistorial {
  cajaId?: string | null;
  desde?: number | null;
  hasta?: number | null;
  tipo?: 'ingreso' | 'egreso' | null;
}

export function filtrarHistorial(items: Transaccion[], filtro: FiltroHistorial): Transaccion[] {
  return items.filter((item) => {
    if (filtro.tipo != null && item.tipo !== filtro.tipo) return false;
    if (filtro.cajaId != null) {
      // El `> 0` importa: `repartirIngreso` emite una entrada por CADA caja
      // activa, incluidas las que el redondeo de `Math.floor` deja en 0 (caja
      // de porcentaje bajo + monto pequeño). Sin esa condición, el historial
      // filtrado por esa caja se llenaría de filas de +$0.00 por ingresos que
      // no le aportaron nada. Los egresos entran por `cajaId` y no se ven
      // afectados: son movimientos de la caja aunque su importe sea 0.
      const tocaLaCaja = item.cajaId === filtro.cajaId
        || item.reparto.some((r) => r.cajaId === filtro.cajaId && r.monto > 0);
      if (!tocaLaCaja) return false;
    }
    if (filtro.desde != null && item.fecha < filtro.desde) return false;
    if (filtro.hasta != null && item.fecha > filtro.hasta) return false;
    return true;
  });
}

export type ClaveRangoFecha = 'todo' | 'mes' | 'mesPasado' | 'anio';

/**
 * Calcula los límites [desde, hasta] (epoch ms, inclusive) para una clave de
 * rango relativa a `ahora`. `ahora` se recibe como argumento (en vez de leer
 * Date.now() internamente) para que la función sea pura y determinística en
 * tests; la pantalla le pasa `Date.now()`.
 */
export function rangoFecha(
  clave: ClaveRangoFecha,
  ahora: number,
): { desde: number | null; hasta: number | null } {
  if (clave === 'todo') return { desde: null, hasta: null };

  const fecha = new Date(ahora);
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();

  if (clave === 'mes') {
    return {
      desde: new Date(anio, mes, 1, 0, 0, 0, 0).getTime(),
      // día 0 del mes siguiente = último día del mes actual.
      hasta: new Date(anio, mes + 1, 0, 23, 59, 59, 999).getTime(),
    };
  }

  if (clave === 'mesPasado') {
    return {
      desde: new Date(anio, mes - 1, 1, 0, 0, 0, 0).getTime(),
      hasta: new Date(anio, mes, 0, 23, 59, 59, 999).getTime(),
    };
  }

  // 'anio'
  return {
    desde: new Date(anio, 0, 1, 0, 0, 0, 0).getTime(),
    hasta: new Date(anio, 11, 31, 23, 59, 59, 999).getTime(),
  };
}
