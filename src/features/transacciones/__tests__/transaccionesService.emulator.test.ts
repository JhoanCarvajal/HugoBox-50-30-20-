import { signInAnonymously, signOut } from 'firebase/auth';
import { auth, conectarEmuladores } from '../../../lib/firebase';
import { crearCajasPorDefecto, listarCajas } from '../../cajas/cajasService';
import {
  agregarIngreso, agregarEgreso, borrarTransaccion, refTransacciones,
} from '../transaccionesService';
import { getDocs } from 'firebase/firestore';

let uid: string;

beforeAll(() => conectarEmuladores());

beforeEach(async () => {
  await signOut(auth).catch(() => {});
  const cred = await signInAnonymously(auth);
  uid = cred.user.uid;
});

it('un ingreso reparte por % y sube los saldos', async () => {
  await crearCajasPorDefecto(uid);
  await agregarIngreso(uid, { monto: 100, descripcion: 'Sueldo', fecha: 1 });
  const cajas = await listarCajas(uid);
  const s = Object.fromEntries(cajas.map((c) => [c.nombre, c.saldo]));
  expect(s).toEqual({ Gastos: 50, Inversión: 20, Ahorro: 30 });
});

it('un egreso baja el saldo de su caja y avisa si excede', async () => {
  await crearCajasPorDefecto(uid);
  await agregarIngreso(uid, { monto: 100, descripcion: 'x', fecha: 1 });
  const gastos = (await listarCajas(uid)).find((c) => c.nombre === 'Gastos')!;
  const r = await agregarEgreso(uid, {
    monto: 80, cajaId: gastos.id, descripcion: 'Mercado', fecha: 2,
  });
  expect(r.advertenciaSaldo).toBe(true); // 80 > 50
  const gastos2 = (await listarCajas(uid)).find((c) => c.nombre === 'Gastos')!;
  expect(gastos2.saldo).toBe(-30);
});

it('agregarEgreso rechaza montos no enteros o no positivos (centavos)', async () => {
  await crearCajasPorDefecto(uid);
  const gastos = (await listarCajas(uid))[0];
  const base = { cajaId: gastos.id, descripcion: 'x', fecha: 1 };
  await expect(agregarEgreso(uid, { ...base, monto: 0.5 })).rejects.toThrow();
  await expect(agregarEgreso(uid, { ...base, monto: 0 })).rejects.toThrow();
  await expect(agregarEgreso(uid, { ...base, monto: -10 })).rejects.toThrow();
  // No debe haber escrito ninguna transacción ni alterado el saldo.
  const snap = await getDocs(refTransacciones(uid));
  expect(snap.docs.length).toBe(0);
  expect((await listarCajas(uid))[0].saldo).toBe(0);
});

it('borrarTransaccion revierte el efecto de un ingreso en los saldos', async () => {
  await crearCajasPorDefecto(uid);
  await agregarIngreso(uid, { monto: 10000, descripcion: 'Sueldo', fecha: 1 });

  const snap = await getDocs(refTransacciones(uid));
  expect(snap.docs.length).toBe(1);
  const txId = snap.docs[0].id;

  await borrarTransaccion(uid, txId);

  const cajas = await listarCajas(uid);
  const s = Object.fromEntries(cajas.map((c) => [c.nombre, c.saldo]));
  expect(s).toEqual({ Gastos: 0, Inversión: 0, Ahorro: 0 });
});
