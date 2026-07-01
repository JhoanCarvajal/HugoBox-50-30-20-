import { signInAnonymously } from 'firebase/auth';
import { renderHook, waitFor } from '@testing-library/react-native';
import { auth, conectarEmuladores } from '../../../lib/firebase';
import { crearCajasPorDefecto } from '../cajasService';
import { useSessionStore } from '../../../stores/sessionStore';
import { useCajas } from '../useCajas';

let uid: string;

beforeAll(async () => {
  conectarEmuladores();
  const cred = await signInAnonymously(auth);
  uid = cred.user.uid;
});

it('escucha en tiempo real las cajas del usuario autenticado', async () => {
  await crearCajasPorDefecto(uid);

  useSessionStore.setState({
    usuario: { uid, email: null, displayName: null, monedaPreferida: 'COP', createdAt: 1 },
    cargando: false,
  });

  const { result } = await renderHook(() => useCajas());

  await waitFor(() => {
    expect(result.current.cajas).toHaveLength(3);
    expect(result.current.cargando).toBe(false);
  });

  const porNombre = Object.fromEntries(
    result.current.cajas.map((c) => [c.nombre, c.porcentaje]),
  );
  expect(porNombre).toEqual({ Gastos: 50, Inversión: 20, Ahorro: 30 });
});
