import { signInAnonymously, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, conectarEmuladores } from '../../../lib/firebase';
import { asegurarUsuario } from '../authService';
import { listarCajas } from '../../cajas/cajasService';
import { Usuario } from '../../../types/models';

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

it('recupera una cuenta a medio crear: doc de usuario sin cajas se autorrepara en el siguiente login', async () => {
  // Simula el escenario del bug: el doc de usuario quedó creado (p.ej. el
  // proceso murió antes de llamar a crearCajasPorDefecto) pero sin cajas.
  const usuarioAMedias: Usuario = {
    uid, email, displayName: 'Damian', monedaPreferida: 'COP', createdAt: Date.now(),
  };
  await setDoc(doc(db, 'users', uid), usuarioAMedias);

  const sinCajasAntes = await listarCajas(uid);
  expect(sinCajasAntes).toHaveLength(0);

  const usuario = await asegurarUsuario({ uid, email, displayName: 'Damian' });

  expect(usuario).toEqual(usuarioAMedias);
  const cajas = await listarCajas(uid);
  expect(cajas).toHaveLength(3);
  const porNombre = Object.fromEntries(cajas.map((c) => [c.nombre, c.porcentaje]));
  expect(porNombre).toEqual({ Gastos: 50, Inversión: 20, Ahorro: 30 });
});
