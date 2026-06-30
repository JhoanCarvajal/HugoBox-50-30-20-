import { signInAnonymously } from 'firebase/auth';
import { auth, conectarEmuladores } from '../../../lib/firebase';
import { crearCajasPorDefecto, listarCajas } from '../cajasService';

let uid: string;

beforeAll(async () => {
  conectarEmuladores();
  const cred = await signInAnonymously(auth);
  uid = cred.user.uid;
});

it('crea las 3 cajas por defecto con 50/20/30', async () => {
  await crearCajasPorDefecto(uid);
  const cajas = await listarCajas(uid);
  expect(cajas).toHaveLength(3);
  const porNombre = Object.fromEntries(cajas.map((c) => [c.nombre, c.porcentaje]));
  expect(porNombre).toEqual({ Gastos: 50, Inversión: 20, Ahorro: 30 });
  expect(cajas.every((c) => c.saldo === 0 && c.esPorDefecto)).toBe(true);
});
