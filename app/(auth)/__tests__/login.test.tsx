import { render, screen, userEvent } from '@testing-library/react-native';
import Login from '../login';
import { entrarConGoogle } from '../../../src/features/auth/authService';

// Se mockea el módulo de auth completo (con factory) para no cargar el real
// `authService.ts` (que a su vez importa Firebase/Google Sign-In): así el
// test de render no toca Firebase real, solo verifica la interacción UI.
jest.mock('../../../src/features/auth/authService', () => ({
  entrarConGoogle: jest.fn(),
}));

describe('Login', () => {
  it('llama a entrarConGoogle al presionar "Continuar con Google"', async () => {
    // @testing-library/react-native@14 hace `render` asíncrono (usa
    // `test-renderer`'s `createRoot` + `act` por debajo): hay que esperarlo
    // antes de consultar `screen`, si no `getByText` falla con
    // "render function has not been called".
    await render(<Login />);

    // `userEvent.press` (en vez de `fireEvent.press`) espera internamente a
    // que se asienten todas las actualizaciones de estado pendientes del
    // `onPress` asíncrono (incluido el `setCargando(false)` del `finally`),
    // así que no hace falta un `waitFor` aparte ni aparecen warnings de React
    // por `setState` fuera de `act()`.
    const user = userEvent.setup();
    await user.press(screen.getByText('Continuar con Google'));

    expect(entrarConGoogle).toHaveBeenCalledTimes(1);
  });
});
