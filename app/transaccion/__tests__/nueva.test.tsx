import { render, screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import NuevaTx from '../nueva';
import { useCajas } from '../../../src/features/cajas/useCajas';
import { useTransacciones } from '../../../src/features/transacciones/useTransacciones';

// Se mockea `expo-router` para que `router.back()` no intente navegar de verdad
// (no hay un Stack real montado en el test) y para poder espiarlo.
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// Se mockea `useCajas` (capa de datos en tiempo real de Firestore) para no
// depender del emulador: solo se necesita una lista fija de cajas para que
// existan los chips de selección en el caso de egreso.
jest.mock('../../../src/features/cajas/useCajas', () => ({
  useCajas: jest.fn(),
}));

// Se mockea `useTransacciones` para espiar `crearIngreso`/`crearEgreso` sin
// tocar Firestore: esto es lo que permite anclar el invariante de dinero
// (unidades en el input → centavos enteros al llamar al servicio).
jest.mock('../../../src/features/transacciones/useTransacciones', () => ({
  useTransacciones: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ back });
    (useCajas as jest.Mock).mockReturnValue({ cajas: cajasMock, cargando: false });
    (useTransacciones as jest.Mock).mockReturnValue({ crearIngreso, crearEgreso });
  });

  // Este es el test que ancla el invariante de dinero: el usuario escribe
  // "100" (unidades/pesos) y el servicio DEBE recibir 10000 (centavos
  // enteros), nunca 100.
  it('convierte el monto de unidades a centavos enteros al crear un ingreso', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('0.00'), '100');
    await user.press(screen.getByText('Guardar'));

    expect(crearIngreso).toHaveBeenCalledWith(10000, '');
    expect(crearEgreso).not.toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('en egreso convierte el monto a centavos y usa la caja elegida', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.press(screen.getByText('egreso'));
    await user.press(screen.getByText('Gastos'));
    await user.type(screen.getByPlaceholderText('0.00'), '50');
    await user.press(screen.getByText('Guardar'));

    expect(crearEgreso).toHaveBeenCalledWith(5000, 'c1', '');
    expect(crearIngreso).not.toHaveBeenCalled();
  });

  it('normaliza coma decimal (es-CO) antes de convertir a centavos', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('0.00'), '100,50');
    await user.press(screen.getByText('Guardar'));

    expect(crearIngreso).toHaveBeenCalledWith(10050, '');
  });

  it('en egreso sin caja seleccionada muestra el error y no llama al servicio', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.press(screen.getByText('egreso'));
    await user.type(screen.getByPlaceholderText('0.00'), '50');
    await user.press(screen.getByText('Guardar'));

    expect(await screen.findByText('Elige una caja para el egreso')).toBeTruthy();
    expect(crearEgreso).not.toHaveBeenCalled();
    expect(crearIngreso).not.toHaveBeenCalled();
  });

  it('con monto vacío muestra el error y no llama al servicio', async () => {
    await render(<NuevaTx />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Guardar'));

    expect(await screen.findByText('El monto debe ser mayor a 0')).toBeTruthy();
    expect(crearIngreso).not.toHaveBeenCalled();
    expect(crearEgreso).not.toHaveBeenCalled();
  });

  it('muestra un hint aclarando el uso de punto/coma para decimales', async () => {
    await render(<NuevaTx />);

    expect(screen.getByPlaceholderText('0.00')).toBeTruthy();
    expect(screen.getByText('Usa punto o coma solo para decimales (ej: 1500.50)')).toBeTruthy();
  });
});
