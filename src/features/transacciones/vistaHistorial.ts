// Proyección del historial a lo que la fila debe pintar.
//
// La app maneja dos conceptos que la UI mezclaba: el MOVIMIENTO (el hecho, por
// su valor 100%) y el IMPACTO EN UNA CAJA (la porción del `reparto` que le
// tocó). Un ingreso de $1.000.000 repartido al 30% en Ahorros es un movimiento
// de $1.000.000 y un impacto de $300.000 en esa caja; el historial pintaba
// siempre el primero, así que al filtrar por Ahorros mostraba $1.000.000.
//
// El único interruptor entre los dos lentes es el filtro de caja. Esta función
// NO filtra: recibe los items ya pasados por `filtrarHistorial` y usa el filtro
// solo para saber con qué lente proyectar.

import { Transaccion, Caja } from '../../types/models';
import { FiltroHistorial } from './filtros';

/** Nombre de respaldo si el reparto apunta a una caja que ya no existe. */
const CAJA_ELIMINADA = 'Caja eliminada';

export interface DesglosePorCaja {
  cajaId: string;
  nombre: string;
  monto: number;
}

export interface MovimientoVista {
  tx: Transaccion;
  /** Monto a pintar: la porción si hay caja filtrada, si no el total. */
  montoEfectivo: number;
  /** `true` cuando `montoEfectivo` es solo una parte de `tx.monto`. */
  esParcial: boolean;
  /** Porcentaje derivado del reparto guardado. `null` si no es parcial. */
  porcentaje: number | null;
  /** Texto de contexto que precede a la fecha en la fila. */
  subtitulo: string;
  /** Reparto por caja. Solo se llena para ingresos sin filtro de caja. */
  desglose: DesglosePorCaja[];
}

export function proyectarHistorial(
  items: Transaccion[],
  filtro: FiltroHistorial,
  cajas: Caja[],
): MovimientoVista[] {
  const nombrePorId = new Map(cajas.map((c) => [c.id, c.nombre]));
  const nombreDe = (id: string) => nombrePorId.get(id) ?? CAJA_ELIMINADA;
  const cajaFiltrada = filtro.cajaId ?? null;

  return items.map((tx) => {
    if (cajaFiltrada != null) {
      // Lente «impacto en caja». Un egreso sale íntegro de una sola caja; un
      // ingreso aporta solo lo que su reparto asignó a esta.
      const montoEfectivo = tx.tipo === 'ingreso'
        ? tx.reparto
          .filter((r) => r.cajaId === cajaFiltrada)
          .reduce((acc, r) => acc + r.monto, 0)
        : tx.monto;
      const esParcial = montoEfectivo < tx.monto;

      return {
        tx,
        montoEfectivo,
        esParcial,
        // El porcentaje sale del reparto guardado y no del porcentaje actual de
        // la caja: si la caja cambia de 30% a 40%, los movimientos viejos deben
        // seguir mostrando el 30% con el que realmente se repartieron.
        porcentaje: esParcial && tx.monto > 0
          ? Math.round((montoEfectivo / tx.monto) * 100)
          : null,
        subtitulo: nombreDe(cajaFiltrada),
        desglose: [],
      };
    }

    // Lente «movimiento»: el valor 100%, sin importar cómo se repartió.
    const desglose: DesglosePorCaja[] = tx.tipo === 'ingreso'
      ? tx.reparto.map((r) => ({ cajaId: r.cajaId, nombre: nombreDe(r.cajaId), monto: r.monto }))
      : [];

    return {
      tx,
      montoEfectivo: tx.monto,
      esParcial: false,
      porcentaje: null,
      subtitulo: subtituloSinFiltro(tx, nombreDe, desglose.length),
      desglose,
    };
  });
}

function subtituloSinFiltro(
  tx: Transaccion,
  nombreDe: (id: string) => string,
  cajasTocadas: number,
): string {
  if (tx.tipo === 'egreso') return tx.cajaId ? nombreDe(tx.cajaId) : '';
  if (cajasTocadas === 0) return '';
  return cajasTocadas === 1 ? '1 caja' : `${cajasTocadas} cajas`;
}
