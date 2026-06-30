import {
  collection, doc, writeBatch, getDoc, getDocs, increment,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { repartirIngreso } from '../../utils/reparto';
import { refCajas } from '../cajas/cajasService';
import { Caja, Transaccion } from '../../types/models';

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
