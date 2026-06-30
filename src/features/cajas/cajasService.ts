import {
  collection, doc, getDocs, writeBatch, addDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Caja, NuevaCaja } from '../../types/models';
import { validarSumaPorcentajes } from './cajasSchema';

export const refCajas = (uid: string) => collection(db, 'users', uid, 'cajas');

const DEFECTO: Omit<Caja, 'id' | 'createdAt'>[] = [
  { nombre: 'Gastos', porcentaje: 50, saldo: 0, esPorDefecto: true, orden: 0 },
  { nombre: 'Inversión', porcentaje: 20, saldo: 0, esPorDefecto: true, orden: 1 },
  { nombre: 'Ahorro', porcentaje: 30, saldo: 0, esPorDefecto: true, orden: 2 },
];

export async function crearCajasPorDefecto(uid: string): Promise<void> {
  const batch = writeBatch(db);
  const now = Date.now();
  for (const c of DEFECTO) {
    const ref = doc(refCajas(uid));
    batch.set(ref, { ...c, createdAt: now });
  }
  await batch.commit();
}

export async function listarCajas(uid: string): Promise<Caja[]> {
  const snap = await getDocs(query(refCajas(uid), orderBy('orden')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Caja, 'id'>) }));
}

export async function crearCaja(
  uid: string, caja: NuevaCaja, porcentajesActuales: number[],
): Promise<string> {
  validarSumaPorcentajes([...porcentajesActuales, caja.porcentaje]);
  const ref = await addDoc(refCajas(uid), {
    nombre: caja.nombre, porcentaje: caja.porcentaje, saldo: 0,
    esPorDefecto: false, orden: porcentajesActuales.length, createdAt: Date.now(),
  });
  return ref.id;
}

export async function actualizarPorcentajes(
  uid: string, cambios: { id: string; porcentaje: number }[],
): Promise<void> {
  validarSumaPorcentajes(cambios.map((c) => c.porcentaje));
  const batch = writeBatch(db);
  for (const c of cambios) {
    batch.update(doc(refCajas(uid), c.id), { porcentaje: c.porcentaje });
  }
  await batch.commit();
}
