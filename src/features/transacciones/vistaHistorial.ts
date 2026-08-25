import type { Transaccion } from '../transacciones/txSchema';
import type { Caja } from '../cajas/cajasSchema';
import type { FiltroHistorial } from './filtros';

const CAJA_ELIMINADA = 'Caja eliminada';

export interface DesglosePorCaja {
  cajaId: string;
  nombre: string;
  monto: number;
}

export interface MovimientoVista {
  tx: Transaccion;
  montoEfectivo: number;
  esParcial: boolean;
  porcentaje: number | null;
  subtitulo: string;
  desglose: DesglosePorCaja[];
}

/**
 * Convierte una lista de transacciones en una "vista" lista para presentar,
 * ajustando los montos según si se está filtrando por caja.
 *
 * Contratos:
 * - No filtra: recibe items ya pasados por `filtrarHistorial` y devuelve una
 *   vista por cada uno, en el mismo orden.
 * - Si hay `filtroHistorial.cajaId`, el monto es la porción que entró a esa caja
 *   (`montoEfectivo`), no el total del movimiento; `esParcial` marca si no fue
 *   100% a esa caja; `porcentaje` es el % que tocó a esa caja (null si fue 100% o
 *   si es un egreso); `desglose` está vacío.
 * - Si no hay `filtroHistorial.cajaId`, el monto es el total, `esParcial` siempre
 *   es false, `porcentaje` siempre es null; `desglose` lista por dónde fue cada
 *   parte; `subtitulo` cuenta cuántas cajas tocó.
 */
export function proyectarHistorial(
  items: Transaccion[],
  filtroHistorial: FiltroHistorial,
  cajas: Caja[],
): MovimientoVista[] {
  const cajasPorId = new Map(cajas.map((c) => [c.id, c]));

  return items.map((tx) => {
    if (filtroHistorial.cajaId) {
      // Lente «impacto en caja»: monto y porcentaje de esta transacción sobre la caja filtrada.
      let montoEnCaja = 0;
      let esParcial = false;

      if (tx.tipo === 'egreso') {
        // Un egreso sale íntegro de su cajaId, no es parcial.
        if (tx.cajaId === filtroHistorial.cajaId) {
          montoEnCaja = tx.monto;
        }
        esParcial = false;
      } else {
        // Un ingreso: busca su porción en el reparto.
        montoEnCaja = tx.reparto.find((r) => r.cajaId === filtroHistorial.cajaId)?.monto ?? 0;
        // Es parcial si no fue 100% a esta caja (reparto vacío, múltiples destinos, o destinado a otra caja).
        const tocaUnaCajaCompleta =
          tx.reparto.length === 1 && tx.reparto[0]?.cajaId === filtroHistorial.cajaId;
        esParcial = !tocaUnaCajaCompleta;
      }

      const porcentaje =
        tx.monto === 0 ? null : esParcial ? Math.round((montoEnCaja / tx.monto) * 100) : null;
      const caja = cajasPorId.get(filtroHistorial.cajaId);
      const subtitulo = caja?.nombre ?? CAJA_ELIMINADA;

      return {
        tx,
        montoEfectivo: montoEnCaja,
        esParcial,
        porcentaje,
        subtitulo,
        desglose: [],
      };
    } else {
      // Lente «movimiento»: monto total y desglose por caja.
      const desglose = tx.reparto.map((r) => ({
        cajaId: r.cajaId,
        nombre: cajasPorId.get(r.cajaId)?.nombre ?? CAJA_ELIMINADA,
        monto: r.monto,
      }));

      let subtitulo = '';
      if (tx.tipo === 'ingreso') {
        const cantCajas = desglose.length;
        subtitulo = cantCajas === 1 ? '1 caja' : `${cantCajas} cajas`;
      } else {
        // Egreso: siempre tiene cajaId, usa el nombre de esa caja.
        const caja = cajasPorId.get(tx.cajaId!);
        subtitulo = caja?.nombre ?? CAJA_ELIMINADA;
      }

      return {
        tx,
        montoEfectivo: tx.monto,
        esParcial: false,
        porcentaje: null,
        subtitulo,
        desglose: tx.tipo === 'ingreso' ? desglose : [],
      };
    }
  });
}
