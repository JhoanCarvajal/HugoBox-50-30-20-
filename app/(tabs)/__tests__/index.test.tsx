import { render, screen, userEvent } from '@testing-library/react-native';
import Cajas from '../index';
import { useRouter } from 'expo-router';
import { useCajas } from '../../../src/features/cajas/useCajas';
import { useHistorial } from '../../../src/features/transacciones/useHistorial';
import { useSessionStore } from '../../../src/stores/sessionStore';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
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
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
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

  it('el pill de Ingresos navega al historial filtrado por ingresos', async () => {
    await render(<Cajas />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Ver historial de ingresos'));

    expect(push).toHaveBeenCalledWith({ pathname: '/historial', params: { tipo: 'ingreso' } });
  });

  it('el pill de Egresos navega al historial filtrado por egresos', async () => {
    await render(<Cajas />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Ver historial de egresos'));

    expect(push).toHaveBeenCalledWith({ pathname: '/historial', params: { tipo: 'egreso' } });
  });
  it('tocar una caja navega al historial filtrado por esa caja', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: cajasMock, cargando: false });
    await render(<Cajas />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Ver historial de Gastos'));

    expect(push).toHaveBeenCalledWith({ pathname: '/historial', params: { cajaId: 'c1' } });
  });
});
