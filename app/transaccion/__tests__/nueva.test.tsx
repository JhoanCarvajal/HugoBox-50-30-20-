import { Alert } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NuevaTx from '../nueva';
import { useCajas } from '../../../src/features/cajas/useCajas';
import { useTransacciones } from '../../../src/features/transacciones/useTransacciones';
import { obtenerTransaccion, borrarTransaccion } from '../../../src/features/transacciones/transaccionesService';
import { useSessionStore } from '../../../src/stores/sessionStore';

// Se mockea `expo-router` para que `router.back()` no intente navegar de verdad
// (no hay un Stack real montado en el test) y para poder espiarlo.
// `useLocalSearchParams` se mockea devolviendo `{}` por defecto (modo alta,
// sin `editId`); los tests de modo edición lo sobreescriben.
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

// Se mockea `useCajas` (capa de datos en tiempo real de Firestore) para no
// depender del emulador: solo se necesita una lista fija de cajas para que
// existan los chips de selección en el caso de egreso.
jest.mock('../../../src/features/cajas/useCajas', () => ({
  useCajas: jest.fn(),
}));

// Se mockea `useTransacciones` para espiar `crearIngreso`/`crearEgreso`/`editar`
// sin tocar Firestore: esto es lo que permite anclar el invariante de dinero
// (unidades en el input → centavos enteros al llamar al servicio).
jest.mock('../../../src/features/transacciones/useTransacciones', () => ({
  useTransacciones: jest.fn(),
}));

// Se mockea `obtenerTransaccion` (usado solo en modo edición para precargar
// el formulario) y `borrarTransaccion` (el botón de borrado del pie) para no
// depender del emulador.
jest.mock('../../../src/features/transacciones/transaccionesService', () => ({
  obtenerTransaccion: jest.fn(),
  borrarTransaccion: jest.fn(),
}));

const cajasMock = [
  {
    id: 'c1', nombre: 'Gastos', porcentaje: 50, saldo: 10000, esPorDefecto: true, orden: 0, createdAt: 1,
  },
  {
    id: 'c2', nombre: 'Ahorros', porcentaje: 30, saldo: 5000, esPorDefecto: true, orden: 1, createdAt: 1,
  },
  {
    id: 'c3', nombre: 'Diversión', porcentaje: 20, saldo: 2000, esPorDefecto: true, orden: 2, createdAt: 1,
  },
];

describe('Nueva transacción', () => {
  const back = jest.fn();
  const crearIngreso = jest.fn();
  const crearEgreso = jest.fn();
  const editar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ back });
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (useCajas as jest.Mock).mockReturnValue({ cajas: cajasMock, cargando: false });
    (useTransacciones as jest.Mock).mockReturnValue({ crearIngreso, crearEgreso, editar });
    useSessionStore.setState({
      usuario: {
        uid: 'u1', email: null, displayName: null, monedaPreferida: 'COP', createdAt: 1,
      },
      cargando: false,
    });
  });

  // Este es el test que ancla el invariante de dinero: el usuario escribe
  // "100" (unidades/pesos) y el servicio DEBE recibir 10000 (centavos
  // enteros), nunca 100.
  it('convierte el monto de unidades a centavos enteros al crear un ingreso', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Ingresa un monto'), '100');
    await user.press(screen.getByText('Registrar ingreso'));

    expect(crearIngreso).toHaveBeenCalledWith(10000, '');
    expect(crearEgreso).not.toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('en egreso convierte el monto a centavos y usa la caja elegida', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Egreso'));
    await user.press(screen.getByText('Gastos'));
    await user.type(screen.getByPlaceholderText('Ingresa un monto'), '50');
    await user.press(screen.getByText('Registrar egreso'));

    expect(crearEgreso).toHaveBeenCalledWith(5000, 'c1', '');
    expect(crearIngreso).not.toHaveBeenCalled();
  });

  it('normaliza el punto decimal antes de convertir a centavos', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Ingresa un monto'), '100.50');
    await user.press(screen.getByText('Registrar ingreso'));

    expect(crearIngreso).toHaveBeenCalledWith(10050, '');
  });

  it('en egreso sin caja seleccionada muestra el error y no llama al servicio', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Egreso'));
    await user.type(screen.getByPlaceholderText('Ingresa un monto'), '50');
    await user.press(screen.getByText('Registrar egreso'));

    expect(await screen.findByText('Elige una caja para el egreso')).toBeTruthy();
    expect(crearEgreso).not.toHaveBeenCalled();
    expect(crearIngreso).not.toHaveBeenCalled();
  });

  it('con monto vacío muestra el error y no llama al servicio', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Registrar ingreso'));

    expect(await screen.findByText('El monto debe ser mayor a 0')).toBeTruthy();
    expect(crearIngreso).not.toHaveBeenCalled();
    expect(crearEgreso).not.toHaveBeenCalled();
  });

  it('en modo alta no ofrece borrar: todavía no hay movimiento que borrar', async () => {
    await render(<NuevaTx />);

    expect(screen.queryByText('Borrar movimiento')).toBeNull();
  });

  it('muestra el campo de monto con prefijo de moneda', async () => {
    await render(<NuevaTx />);

    expect(screen.getByPlaceholderText('Ingresa un monto')).toBeTruthy();
    expect(screen.getByText('$')).toBeTruthy();
  });
});

describe('Nueva transacción — modo edición', () => {
  const back = jest.fn();
  const crearIngreso = jest.fn();
  const crearEgreso = jest.fn();
  const editar = jest.fn();

  const txEgresoMock = {
    id: 'tx1',
    tipo: 'egreso' as const,
    monto: 5000,
    fecha: 1,
    descripcion: 'Mercado',
    cajaId: 'c1',
    reparto: [],
    createdAt: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ back });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ editId: 'tx1' });
    (useCajas as jest.Mock).mockReturnValue({ cajas: cajasMock, cargando: false });
    (useTransacciones as jest.Mock).mockReturnValue({ crearIngreso, crearEgreso, editar });
    (obtenerTransaccion as jest.Mock).mockResolvedValue(txEgresoMock);
    (borrarTransaccion as jest.Mock).mockResolvedValue(undefined);
    // El borrado es destructivo: pasa por `Alert.alert` y solo se ejecuta
    // desde el botón de confirmación (ver `confirmarBorrado`).
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useSessionStore.setState({
      usuario: {
        uid: 'u1', email: null, displayName: null, monedaPreferida: 'COP', createdAt: 1,
      },
      cargando: false,
    });
  });

  it('con editId precarga monto, descripción, tipo y caja, y deshabilita el switch de tipo', async () => {
    await render(<NuevaTx />);

    expect(await screen.findByDisplayValue('50')).toBeTruthy(); // 5000 centavos -> 50 unidades
    expect(screen.getByDisplayValue('Mercado')).toBeTruthy();
    // El botón dice "Guardar cambios" en vez de "Guardar".
    expect(screen.getByText('Guardar cambios')).toBeTruthy();
  });

  it('con editId el botón "Guardar cambios" llama a editar con los datos del formulario', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('50');
    await user.press(screen.getByText('Guardar cambios'));

    expect(editar).toHaveBeenCalledWith('tx1', { monto: 5000, descripcion: 'Mercado', cajaId: 'c1' });
    expect(crearIngreso).not.toHaveBeenCalled();
    expect(crearEgreso).not.toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('el switch de tipo está deshabilitado en modo edición', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('50');
    // El tipo precargado es "egreso"; intentar pulsar "Ingreso" no debe cambiarlo.
    await user.press(screen.getByText('Ingreso'));
    await user.press(screen.getByText('Guardar cambios'));

    expect(editar).toHaveBeenCalledWith('tx1', expect.objectContaining({ cajaId: 'c1' }));
  });

  it('pide confirmación antes de borrar el movimiento', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('50');
    await user.press(screen.getByText('Borrar movimiento'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Borrar',
      '¿Eliminar este movimiento? Se revertirán los saldos.',
      expect.any(Array),
    );
    expect(borrarTransaccion).not.toHaveBeenCalled();
  });

  it('al confirmar borra el movimiento del usuario en sesión', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('50');
    await user.press(screen.getByText('Borrar movimiento'));
    await confirmarBorrado();

    expect(borrarTransaccion).toHaveBeenCalledWith('u1', 'tx1');
  });

  it('tras borrar vuelve a la pantalla anterior', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('50');
    await user.press(screen.getByText('Borrar movimiento'));
    await confirmarBorrado();

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('si el borrado falla avisa y deja al usuario en el formulario', async () => {
    (borrarTransaccion as jest.Mock).mockRejectedValueOnce(new Error('Sin conexión'));

    await render(<NuevaTx />);
    const user = userEvent.setup();

    await screen.findByDisplayValue('50');
    await user.press(screen.getByText('Borrar movimiento'));
    await confirmarBorrado();

    expect(Alert.alert).toHaveBeenCalledWith('No se pudo borrar', 'Sin conexión');
    expect(back).not.toHaveBeenCalled();
  });
});

/**
 * Ejecuta el botón destructivo del `Alert.alert` de confirmación, que es la
 * única vía por la que el formulario llega a borrar de verdad.
 */
async function confirmarBorrado() {
  const [, , botones] = (Alert.alert as jest.Mock).mock.calls.at(-1)!;
  const confirmar = (botones as { style?: string; onPress?: () => void }[])
    .find((b) => b.style === 'destructive');

  await act(async () => { await confirmar!.onPress!(); });
}
