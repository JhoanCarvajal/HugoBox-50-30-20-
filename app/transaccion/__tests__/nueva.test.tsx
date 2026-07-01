import { render, screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NuevaTx from '../nueva';
import { useCajas } from '../../../src/features/cajas/useCajas';
import { useTransacciones } from '../../../src/features/transacciones/useTransacciones';
import { obtenerTransaccion } from '../../../src/features/transacciones/transaccionesService';
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
// el formulario) para no depender del emulador.
jest.mock('../../../src/features/transacciones/transaccionesService', () => ({
  obtenerTransaccion: jest.fn(),
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

    await user.type(screen.getByPlaceholderText('0.00'), '100');
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
    await user.type(screen.getByPlaceholderText('0.00'), '50');
    await user.press(screen.getByText('Registrar egreso'));

    expect(crearEgreso).toHaveBeenCalledWith(5000, 'c1', '');
    expect(crearIngreso).not.toHaveBeenCalled();
  });

  it('normaliza coma decimal (es-CO) antes de convertir a centavos', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('0.00'), '100,50');
    await user.press(screen.getByText('Registrar ingreso'));

    expect(crearIngreso).toHaveBeenCalledWith(10050, '');
  });

  it('en egreso sin caja seleccionada muestra el error y no llama al servicio', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Egreso'));
    await user.type(screen.getByPlaceholderText('0.00'), '50');
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

  it('muestra un hint aclarando el uso de punto/coma para decimales', async () => {
    await render(<NuevaTx />);

    expect(screen.getByPlaceholderText('0.00')).toBeTruthy();
    expect(screen.getByText('Usa punto o coma para miles y decimales (ej: 1.500,50)')).toBeTruthy();
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
});
