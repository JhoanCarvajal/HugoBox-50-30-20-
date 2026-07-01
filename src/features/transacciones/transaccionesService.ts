import {
  collection, doc, writeBatch, getDoc, getDocs, increment,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { repartirIngreso } from '../../utils/reparto';
import { refCajas } from '../cajas/cajasService';
import { Caja, Reparto, Transaccion } from '../../types/models';

export const refTransacciones = (uid: string) =>
  collection(db, 'users', uid, 'transacciones');

export async function agregarIngreso(
  uid: string,
  { monto, descripcion, fecha }: { monto: number; descripcion: string; fecha: number },
): Promise<void> {
  const snap = await getDocs(refCajas(uid));
  const cajas = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Caja, 'id'>) }));
  const reparto = repartirIngreso(monto, cajas);

  const batch = writeBatch(db);
  const txRef = doc(refTransacciones(uid));
  batch.set(txRef, {
    tipo: 'ingreso', monto, fecha, descripcion, cajaId: null,
    reparto, createdAt: Date.now(),
  } as Omit<Transaccion, 'id'>);
  for (const p of reparto) {
    batch.update(doc(refCajas(uid), p.cajaId), { saldo: increment(p.monto) });
  }
  await batch.commit();
}

export async function agregarEgreso(
  uid: string,
  { monto, cajaId, descripcion, fecha }:
    { monto: number; cajaId: string; descripcion: string; fecha: number },
): Promise<{ advertenciaSaldo: boolean }> {
  if (!Number.isInteger(monto) || monto <= 0) {
    throw new Error('El monto (en centavos) debe ser un entero positivo');
  }
  const cajaSnap = await getDoc(doc(refCajas(uid), cajaId));
  const saldoActual = (cajaSnap.data() as Caja | undefined)?.saldo ?? 0;
  const advertenciaSaldo = monto > saldoActual;

  const batch = writeBatch(db);
  const txRef = doc(refTransacciones(uid));
  batch.set(txRef, {
    tipo: 'egreso', monto, fecha, descripcion, cajaId,
    reparto: [], createdAt: Date.now(),
  } as Omit<Transaccion, 'id'>);
  batch.update(doc(refCajas(uid), cajaId), { saldo: increment(-monto) });
  await batch.commit();
  return { advertenciaSaldo };
}

export async function borrarTransaccion(uid: string, txId: string): Promise<void> {
  const txSnap = await getDoc(doc(refTransacciones(uid), txId));
  const tx = txSnap.data() as Transaccion | undefined;
  if (!tx) return;
  const batch = writeBatch(db);
  if (tx.tipo === 'ingreso') {
    for (const p of tx.reparto) {
      batch.update(doc(refCajas(uid), p.cajaId), { saldo: increment(-p.monto) });
    }
  } else if (tx.cajaId) {
    batch.update(doc(refCajas(uid), tx.cajaId), { saldo: increment(tx.monto) });
  }
  batch.delete(doc(refTransacciones(uid), txId));
  await batch.commit();
}

export async function obtenerTransaccion(uid: string, txId: string): Promise<Transaccion | null> {
  const snap = await getDoc(doc(refTransacciones(uid), txId));
  const data = snap.data() as Omit<Transaccion, 'id'> | undefined;
  if (!data) return null;
  return { id: snap.id, ...data };
}

/**
 * Edita el MONTO, la DESCRIPCIÓN y (solo en egresos) la CAJA de origen de una
 * transacción ya registrada. El TIPO ('ingreso'/'egreso') NO se puede
 * cambiar aquí: si el usuario necesita convertir un ingreso en egreso (o
 * viceversa), debe borrar la transacción y crear una nueva. Ver
 * restricción de alcance documentada en el spec de la feature.
 *
 * Revierte el efecto de la transacción original en los saldos y aplica el
 * de la nueva, de forma atómica (un solo writeBatch), acumulando el DELTA
 * NETO por caja en memoria antes de escribir: así, si una caja se ve
 * afectada tanto por la reversión como por el nuevo efecto (p.ej. un
 * ingreso que reparte otra vez a la misma caja, o un egreso que no cambia
 * de caja), se emite un único `batch.update` con el `increment` neto para
 * esa caja. Dos `batch.update` al mismo doc dentro de un mismo batch no se
 * suman: el segundo pisa al primero y se perdería uno de los increments.
 */
export async function editarTransaccion(
  uid: string,
  txId: string,
  cambios: { monto: number; descripcion: string; cajaId?: string },
): Promise<{ advertenciaSaldo: boolean }> {
  if (!Number.isInteger(cambios.monto) || cambios.monto <= 0) {
    throw new Error('El monto (en centavos) debe ser un entero positivo');
  }

  const txRef = doc(refTransacciones(uid), txId);
  const txSnap = await getDoc(txRef);
  const original = txSnap.data() as Omit<Transaccion, 'id'> | undefined;
  if (!original) {
    throw new Error('La transacción no existe');
  }

  const cajasSnap = await getDocs(refCajas(uid));
  const cajas = cajasSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Caja, 'id'>) }));
  const saldoPorCaja = new Map(cajas.map((c) => [c.id, c.saldo]));

  // delta neto por caja (en centavos, puede ser negativo).
  const delta = new Map<string, number>();
  const add = (cajaId: string, n: number) => delta.set(cajaId, (delta.get(cajaId) ?? 0) + n);

  // 1) Revertir el efecto de la transacción original.
  if (original.tipo === 'ingreso') {
    for (const p of original.reparto) add(p.cajaId, -p.monto);
  } else if (original.cajaId) {
    add(original.cajaId, original.monto);
  }

  // 2) Aplicar el efecto de la transacción editada (mismo tipo).
  let nuevoReparto: Reparto[] = [];
  let nuevaCajaId = original.cajaId;
  let advertenciaSaldo = false;
  if (original.tipo === 'ingreso') {
    nuevoReparto = repartirIngreso(cambios.monto, cajas);
    for (const p of nuevoReparto) add(p.cajaId, p.monto);
  } else {
    nuevaCajaId = cambios.cajaId ?? original.cajaId;
    if (nuevaCajaId) {
      // El saldo disponible real es el actual MÁS lo que devuelve la reversión
      // del egreso original, pero solo si este sale de la MISMA caja (si el
      // egreso cambia de caja, la reversión va a la caja vieja y no cuenta para
      // la nueva). Así el aviso no da falsos positivos al editar el monto.
      const saldoDisponible = (saldoPorCaja.get(nuevaCajaId) ?? 0)
        + (nuevaCajaId === original.cajaId ? original.monto : 0);
      advertenciaSaldo = cambios.monto > saldoDisponible;
      add(nuevaCajaId, -cambios.monto);
    }
  }

  const batch = writeBatch(db);
  for (const [cajaId, n] of delta) {
    if (n !== 0) {
      batch.update(doc(refCajas(uid), cajaId), { saldo: increment(n) });
    }
  }
  const cambiosTx: Partial<Transaccion> = {
    monto: cambios.monto,
    descripcion: cambios.descripcion,
  };
  if (original.tipo === 'ingreso') {
    cambiosTx.reparto = nuevoReparto;
  } else {
    cambiosTx.cajaId = nuevaCajaId;
  }
  batch.update(txRef, cambiosTx);
  await batch.commit();

  return { advertenciaSaldo };
}
