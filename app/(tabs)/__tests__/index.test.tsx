import { render, screen } from '@testing-library/react-native';
import Cajas from '../index';
import { useCajas } from '../../../src/features/cajas/useCajas';
import { useHistorial } from '../../../src/features/transacciones/useHistorial';
import { useSessionStore } from '../../../src/stores/sessionStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../../src/features/cajas/useCajas', () => ({
  useCajas: jest.fn(),
}));

jest.mock('../../../src/features/transacciones/useHistorial', () => ({
  useHistorial: jest.fn(),
}));

const cajasMock = [
  { id: 'c1', nombre: 'Gastos', porcentaje: 50, saldo: 10000, esPorDefecto: true, orden: 0, createdAt: 1 },
];

describe('Dashboard (index)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCajas as jest.Mock).mockReturnValue({ cajas: [], cargando: false });
    (useHistorial as jest.Mock).mockReturnValue({ items: [], cargando: false });
    useSessionStore.setState({
      usuario: {
        uid: 'u1',
        email: 'damian@example.com',
        displayName: 'Damian',
        monedaPreferida: 'COP',
        createdAt: 1,
      },
      cargando: false,
    });
  });

  it('muestra el indicador de carga', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [], cargando: true });
    await render(<Cajas />);
    expect(screen.getByTestId('dashboard-cargando')).toBeTruthy();
    expect(screen.queryByText('Aún no tienes cajas')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay cajas', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [], cargando: false });
    await render(<Cajas />);
    expect(screen.getByText('Aún no tienes cajas')).toBeTruthy();
  });

  it('lista las cajas y el enlace para editarlas', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: cajasMock, cargando: false });
    await render(<Cajas />);
    expect(screen.getByText('Gastos')).toBeTruthy();
    expect(screen.getByText('Editar')).toBeTruthy();
  });

  it('saluda con el nombre del usuario', async () => {
    await render(<Cajas />);
    expect(screen.getByText('Hola, Damian')).toBeTruthy();
  });

  it('usa el email cuando no hay displayName', async () => {
    useSessionStore.setState({
      usuario: {
        uid: 'u2',
        email: 'sin-nombre@example.com',
        displayName: null,
        monedaPreferida: 'COP',
        createdAt: 1,
      },
      cargando: false,
    });
    await render(<Cajas />);
    expect(screen.getByText('Hola, sin-nombre@example.com')).toBeTruthy();
  });
});
