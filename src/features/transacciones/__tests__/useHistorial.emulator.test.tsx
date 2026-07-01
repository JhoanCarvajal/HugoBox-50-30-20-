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

// El filtrado por caja/fecha se movió a `filtrarHistorial` (unit, ver
// filtros.test.ts): el hook ahora solo trae TODO el historial del usuario.
it(
  'trae todas las transacciones del usuario (ingresos y egresos) ordenadas por fecha descendente',
  async () => {
    await crearCajasPorDefecto(uid);
    const gastos = (await listarCajas(uid)).find((c) => c.nombre === 'Gastos')!;

    await agregarIngreso(uid, { monto: 10000, descripcion: 'Sueldo', fecha: 1 });
    await agregarEgreso(uid, {
      monto: 500, cajaId: gastos.id, descripcion: 'Mercado', fecha: 2,
    });
    await agregarIngreso(uid, { monto: 2000, descripcion: 'Extra', fecha: 3 });

    const { result } = await renderHook(() => useHistorial());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(3);
    });

    expect(result.current.items.map((t) => t.fecha)).toEqual([3, 2, 1]);
    expect(result.current.items.map((t) => t.tipo).sort()).toEqual(
      ['egreso', 'ingreso', 'ingreso'].sort(),
    );
    expect(result.current.cargando).toBe(false);
  },
);
