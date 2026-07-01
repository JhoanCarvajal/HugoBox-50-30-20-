import { signInAnonymously, signOut } from 'firebase/auth';
import { getDocs } from 'firebase/firestore';
import { auth, conectarEmuladores } from '../../../lib/firebase';
import { crearCajasPorDefecto, listarCajas } from '../../cajas/cajasService';
import {
  agregarIngreso, agregarEgreso, editarTransaccion, obtenerTransaccion, refTransacciones,
} from '../transaccionesService';

let uid: string;

beforeAll(() => conectarEmuladores());

beforeEach(async () => {
  await signOut(auth).catch(() => {});
  const cred = await signInAnonymously(auth);
  uid = cred.user.uid;
});

it('editar un INGRESO recalcula el reparto nuevo, no lo suma al viejo', async () => {
  await crearCajasPorDefecto(uid);
  await agregarIngreso(uid, { monto: 10000, descripcion: 'Sueldo', fecha: 1 });

  const snap = await getDocs(refTransacciones(uid));
  expect(snap.docs.length).toBe(1);
  const txId = snap.docs[0].id;

  const r = await editarTransaccion(uid, txId, { monto: 20000, descripcion: 'Sueldo corregido' });
  expect(r.advertenciaSaldo).toBe(false);

  const cajas = await listarCajas(uid);
  const s = Object.fromEntries(cajas.map((c) => [c.nombre, c.saldo]));
  // Reparto de 20000 (50/20/30), NO la suma de 10000 + 20000.
  expect(s).toEqual({ Gastos: 10000, Inversión: 4000, Ahorro: 6000 });

  const tx = await obtenerTransaccion(uid, txId);
  expect(tx?.monto).toBe(20000);
  expect(tx?.descripcion).toBe('Sueldo corregido');
  expect(tx?.tipo).toBe('ingreso');
  const repartoTotal = tx?.reparto.reduce((sum, p) => sum + p.monto, 0);
  expect(repartoTotal).toBe(20000);
});

it('editar un EGRESO en la misma caja aplica el delta neto correcto', async () => {
  await crearCajasPorDefecto(uid);
  await agregarIngreso(uid, { monto: 100000, descripcion: 'Sueldo', fecha: 1 });
  const gastos = (await listarCajas(uid)).find((c) => c.nombre === 'Gastos')!;
  expect(gastos.saldo).toBe(50000);

  await agregarEgreso(uid, {
    monto: 2000, cajaId: gastos.id, descripcion: 'Mercado', fecha: 2,
  });
  const gastosTrasEgreso = (await listarCajas(uid)).find((c) => c.nombre === 'Gastos')!;
  expect(gastosTrasEgreso.saldo).toBe(48000);

  const snap = await getDocs(refTransacciones(uid));
  const txEgreso = snap.docs.find((d) => d.data().tipo === 'egreso')!;

  const r = await editarTransaccion(uid, txEgreso.id, { monto: 5000, descripcion: 'Mercado grande' });
  expect(r.advertenciaSaldo).toBe(false); // 5000 <= saldo actual (48000) antes de aplicar

  const gastosFinal = (await listarCajas(uid)).find((c) => c.nombre === 'Gastos')!;
  // Revertir 2000 (+2000) y aplicar 5000 (-5000): neto -3000 sobre 48000 => 45000.
  expect(gastosFinal.saldo).toBe(45000);

  const tx = await obtenerTransaccion(uid, txEgreso.id);
  expect(tx?.monto).toBe(5000);
  expect(tx?.descripcion).toBe('Mercado grande');
  expect(tx?.cajaId).toBe(gastos.id);
});

it('editar un EGRESO cambiando de caja mueve el efecto de una caja a otra', async () => {
  await crearCajasPorDefecto(uid);
  await agregarIngreso(uid, { monto: 100000, descripcion: 'Sueldo', fecha: 1 });
  const cajas0 = await listarCajas(uid);
  const gastos = cajas0.find((c) => c.nombre === 'Gastos')!;
  const ahorro = cajas0.find((c) => c.nombre === 'Ahorro')!;

  await agregarEgreso(uid, {
    monto: 2000, cajaId: gastos.id, descripcion: 'Mercado', fecha: 2,
  });
  const snap = await getDocs(refTransacciones(uid));
  const txEgreso = snap.docs.find((d) => d.data().tipo === 'egreso')!;

  await editarTransaccion(uid, txEgreso.id, {
    monto: 2000, descripcion: 'Mercado (ahora desde Ahorro)', cajaId: ahorro.id,
  });

  const cajasFinal = await listarCajas(uid);
  const gastosFinal = cajasFinal.find((c) => c.nombre === 'Gastos')!;
  const ahorroFinal = cajasFinal.find((c) => c.nombre === 'Ahorro')!;
  expect(gastosFinal.saldo).toBe(50000); // recupera los 2000
  expect(ahorroFinal.saldo).toBe(28000); // 30000 - 2000

  const tx = await obtenerTransaccion(uid, txEgreso.id);
  expect(tx?.cajaId).toBe(ahorro.id);
  expect(tx?.monto).toBe(2000);
});

it('editarTransaccion rechaza montos no enteros o no positivos (centavos)', async () => {
  await crearCajasPorDefecto(uid);
  await agregarIngreso(uid, { monto: 10000, descripcion: 'x', fecha: 1 });
  const snap = await getDocs(refTransacciones(uid));
  const txId = snap.docs[0].id;

  await expect(editarTransaccion(uid, txId, { monto: 0.5, descripcion: 'x' })).rejects.toThrow();
  await expect(editarTransaccion(uid, txId, { monto: 0, descripcion: 'x' })).rejects.toThrow();
  await expect(editarTransaccion(uid, txId, { monto: -10, descripcion: 'x' })).rejects.toThrow();

  // No debe haber alterado ni el monto de la tx ni los saldos.
  const tx = await obtenerTransaccion(uid, txId);
  expect(tx?.monto).toBe(10000);
  const cajas = await listarCajas(uid);
  const s = Object.fromEntries(cajas.map((c) => [c.nombre, c.saldo]));
  expect(s).toEqual({ Gastos: 5000, Inversión: 2000, Ahorro: 3000 });
});

it('obtenerTransaccion devuelve null si el documento no existe', async () => {
  await crearCajasPorDefecto(uid);
  const tx = await obtenerTransaccion(uid, 'no-existe');
  expect(tx).toBeNull();
});
