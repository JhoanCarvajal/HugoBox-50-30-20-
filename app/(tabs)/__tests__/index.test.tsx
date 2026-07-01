import { render, screen } from '@testing-library/react-native';
import Cajas from '../index';
import { useCajas } from '../../../src/features/cajas/useCajas';

// Se mockea `expo-router` para que `router.push` no intente navegar de
// verdad (no hay un Stack real montado en el test).
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Se mockea `useCajas` (capa de datos en tiempo real de Firestore) para no
// depender del emulador: solo se necesita controlar `cajas`/`cargando`.
jest.mock('../../../src/features/cajas/useCajas', () => ({
  useCajas: jest.fn(),
}));

const cajasMock = [
  {
    id: 'c1', nombre: 'Gastos', porcentaje: 50, saldo: 10000, esPorDefecto: true, orden: 0, createdAt: 1,
  },
];

describe('Dashboard (cajas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mientras cargando=true muestra un indicador de carga en vez de la lista vacía', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [], cargando: true });

    await render(<Cajas />);

    expect(screen.getByTestId('dashboard-cargando')).toBeTruthy();
    expect(screen.queryByText('Aún no tienes cajas')).toBeNull();
  });

  it('tras cargar sin cajas muestra un mensaje de estado vacío', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [], cargando: false });

    await render(<Cajas />);

    expect(screen.getByText('Aún no tienes cajas')).toBeTruthy();
  });

  it('tras cargar con cajas las muestra y conserva el FAB y "Gestionar cajas"', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: cajasMock, cargando: false });

    await render(<Cajas />);

    expect(screen.getByText('Gastos')).toBeTruthy();
    expect(screen.getByText('Gestionar cajas')).toBeTruthy();
    expect(screen.getByText('＋ Movimiento')).toBeTruthy();
  });
});
