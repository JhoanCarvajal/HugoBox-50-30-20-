import { signInAnonymously, signOut } from 'firebase/auth';
import { renderHook, waitFor } from '@testing-library/react-native';
import { auth, conectarEmuladores } from '../../../lib/firebase';
import { crearCajasPorDefecto, listarCajas } from '../../cajas/cajasService';
import { agregarIngreso, agregarEgreso } from '../transaccionesService';
import { useSessionStore } from '../../../stores/sessionStore';
import { useHistorial } from '../useHistorial';

let uid: string;

beforeAll(() => conectarEmuladores());

beforeEach(async () => {
  await signOut(auth).catch(() => {});
  const cred = await signInAnonymously(auth);
  uid = cred.user.uid;
  useSessionStore.setState({
    usuario: { uid, email: null, displayName: null, monedaPreferida: 'COP', createdAt: 1 },
    cargando: false,
  });
});

it('sin filtro trae todas las transacciones ordenadas por fecha descendente', async () => {
  await crearCajasPorDefecto(uid);
  const gastos = (await listarCajas(uid)).find((c) => c.nombre === 'Gastos')!;

  await agregarIngreso(uid, { monto: 10000, descripcion: 'Sueldo', fecha: 1 });
  await agregarEgreso(uid, {
    monto: 500, cajaId: gastos.id, descripcion: 'Mercado', fecha: 2,
  });
  await agregarIngreso(uid, { monto: 2000, descripcion: 'Extra', fecha: 3 });

  const { result } = await renderHook(() => useHistorial(null));

  await waitFor(() => {
    expect(result.current.items).toHaveLength(3);
  });

  expect(result.current.items.map((t) => t.fecha)).toEqual([3, 2, 1]);
});

it(
  'con filtro por caja trae solo los egresos de esa caja '
  + '(los ingresos se guardan con cajaId:null porque se reparten entre cajas)',
  async () => {
    await crearCajasPorDefecto(uid);
    const cajas = await listarCajas(uid);
    const cajaA = cajas.find((c) => c.nombre === 'Gastos')!;
    const cajaB = cajas.find((c) => c.nombre === 'Ahorro')!;

    // Ingreso inicial para tener saldo en ambas cajas (cajaId: null, no debe aparecer al filtrar).
    await agregarIngreso(uid, { monto: 100000, descripcion: 'Sueldo', fecha: 1 });
    // 2 egresos en la caja A.
    await agregarEgreso(uid, {
      monto: 1000, cajaId: cajaA.id, descripcion: 'Mercado', fecha: 2,
    });
    await agregarEgreso(uid, {
      monto: 2000, cajaId: cajaA.id, descripcion: 'Transporte', fecha: 3,
    });
    // 1 egreso en la caja B (no debe aparecer al filtrar por A).
    await agregarEgreso(uid, {
      monto: 3000, cajaId: cajaB.id, descripcion: 'Otro', fecha: 4,
    });

    const { result } = await renderHook(() => useHistorial(cajaA.id));

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(result.current.items.every((t) => t.cajaId === cajaA.id)).toBe(true);
    expect(result.current.items.every((t) => t.tipo === 'egreso')).toBe(true);
    expect(result.current.items.map((t) => t.fecha)).toEqual([3, 2]);
  },
);
