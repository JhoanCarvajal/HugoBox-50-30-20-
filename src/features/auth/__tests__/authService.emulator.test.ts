import { signInAnonymously, signOut } from 'firebase/auth';
import { auth, conectarEmuladores } from '../../../lib/firebase';
import { asegurarUsuario } from '../authService';
import { listarCajas } from '../../cajas/cajasService';

let uid: string;
let email: string | null;

beforeAll(() => {
  conectarEmuladores();
});

beforeEach(async () => {
  await signOut(auth).catch(() => {});
  const cred = await signInAnonymously(auth);
  uid = cred.user.uid;
  email = cred.user.email;
});

it('primer ingreso: crea el doc del usuario con monedaPreferida COP y sus 3 cajas por defecto', async () => {
  const usuario = await asegurarUsuario({ uid, email, displayName: 'Damian' });

  expect(usuario).toEqual({
    uid, email, displayName: 'Damian', monedaPreferida: 'COP', createdAt: expect.any(Number),
  });

  const cajas = await listarCajas(uid);
  expect(cajas).toHaveLength(3);
  const porNombre = Object.fromEntries(cajas.map((c) => [c.nombre, c.porcentaje]));
  expect(porNombre).toEqual({ Gastos: 50, Inversión: 20, Ahorro: 30 });
});

it('ingresos posteriores: no duplica cajas ni re-crea el doc del usuario', async () => {
  const primero = await asegurarUsuario({ uid, email, displayName: 'Damian' });
  const segundo = await asegurarUsuario({ uid, email, displayName: 'Damian' });

  expect(segundo).toEqual(primero);

  const cajas = await listarCajas(uid);
  expect(cajas).toHaveLength(3);
});
