import { agregarEgreso, agregarIngreso } from '../transacciones/transaccionesService';
import { MovimientoDemo } from './generarDemo';

export interface ServiciosSiembra {
  agregarIngreso: (
    uid: string,
    datos: { monto: number; descripcion: string; fecha: number },
  ) => Promise<unknown>;
  agregarEgreso: (
    uid: string,
    datos: { monto: number; cajaId: string; descripcion: string; fecha: number },
  ) => Promise<unknown>;
}

export interface OpcionesSiembra {
  servicios?: ServiciosSiembra;
  onProgreso?: (hechos: number, total: number) => void;
}

const SERVICIOS_REALES: ServiciosSiembra = { agregarIngreso, agregarEgreso };

/**
 * Crea en Firestore los movimientos generados, en orden cronológico.
 * Va uno a uno a propósito: cada ingreso reparte según los porcentajes vigentes
 * y cada egreso descuenta del saldo ya acumulado.
 */
export async function sembrarMovimientos(
  uid: string,
  movimientos: MovimientoDemo[],
  { servicios = SERVICIOS_REALES, onProgreso }: OpcionesSiembra = {},
): Promise<number> {
  let hechos = 0;

  for (const m of movimientos) {
    if (m.tipo === 'ingreso') {
      await servicios.agregarIngreso(uid, {
        monto: m.monto,
        descripcion: m.descripcion,
        fecha: m.fecha,
      });
    } else {
      await servicios.agregarEgreso(uid, {
        monto: m.monto,
        cajaId: m.cajaId!,
        descripcion: m.descripcion,
        fecha: m.fecha,
      });
    }

    hechos += 1;
    onProgreso?.(hechos, movimientos.length);
  }

  return hechos;
}
