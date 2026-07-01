import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import Cajas from '../index';
import { useCajas } from '../../../src/features/cajas/useCajas';
import { cerrarSesion } from '../../../src/features/auth/authService';
import { useSessionStore } from '../../../src/stores/sessionStore';

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

// Se mockea el módulo de auth completo (con factory) para no cargar el real
// `authService.ts` (que a su vez importa Firebase/Google Sign-In): así el
// test solo verifica que la pantalla invoca `cerrarSesion`, no la lógica
// real de Firebase.
jest.mock('../../../src/features/auth/authService', () => ({
  cerrarSesion: jest.fn(),
}));

const cajasMock = [
  {
    id: 'c1', nombre: 'Gastos', porcentaje: 50, saldo: 10000, esPorDefecto: true, orden: 0, createdAt: 1,
  },
];

describe('Dashboard (cajas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCajas as jest.Mock).mockReturnValue({ cajas: [], cargando: false });
    // Se usa el store real de zustand (no un mock del módulo) para poder
    // fijar el `usuario` de sesión, igual que en el test de `historial`.
    useSessionStore.setState({
      usuario: {
        uid: 'u1', email: 'damian@example.com', displayName: 'Damian', monedaPreferida: 'COP', createdAt: 1,
      },
      cargando: false,
    });
    jest.spyOn(Alert, 'alert');
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
    expect(screen.getByTestId('dashboard-fab')).toBeTruthy();
  });

  it('muestra el nombre del usuario y el botón "Salir" en el encabezado', async () => {
    await render(<Cajas />);

    expect(screen.getByText('Hola, Damian')).toBeTruthy();
    expect(screen.getByText('Salir')).toBeTruthy();
  });

  it('si el usuario no tiene displayName, muestra su email', async () => {
    useSessionStore.setState({
      usuario: {
        uid: 'u2', email: 'sin-nombre@example.com', displayName: null, monedaPreferida: 'COP', createdAt: 1,
      },
      cargando: false,
    });

    await render(<Cajas />);

    expect(screen.getByText('Hola, sin-nombre@example.com')).toBeTruthy();
  });

  it('pulsar "Salir" pide confirmación antes de cerrar sesión', async () => {
    await render(<Cajas />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Salir'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Cerrar sesión',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancelar' }),
        expect.objectContaining({ text: 'Salir' }),
      ]),
    );
    expect(cerrarSesion).not.toHaveBeenCalled();
  });

  it('confirmar "Salir" en el diálogo llama a cerrarSesion', async () => {
    await render(<Cajas />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Salir'));

    const botones = (Alert.alert as jest.Mock).mock.calls[0][2];
    const botonSalir = botones.find((b: { text: string }) => b.text === 'Salir');
    await botonSalir.onPress();

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
  });
});
