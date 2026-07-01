import { render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Perfil from '../perfil';
import { cerrarSesion } from '../../../src/features/auth/authService';
import { useSessionStore } from '../../../src/stores/sessionStore';

jest.mock('../../../src/features/auth/authService', () => ({
  cerrarSesion: jest.fn(),
}));

describe('Perfil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    jest.spyOn(Alert, 'alert');
  });

  it('muestra los datos del usuario y las opciones', async () => {
    await render(<Perfil />);
    expect(screen.getByText('Perfil')).toBeTruthy();
    expect(screen.getByText('Damian')).toBeTruthy();
    expect(screen.getByText('damian@example.com')).toBeTruthy();
    expect(screen.getByText('Cerrar sesión')).toBeTruthy();
  });

  it('pide confirmación antes de cerrar sesión', async () => {
    const user = userEvent.setup();
    await render(<Perfil />);
    await user.press(screen.getByText('Cerrar sesión'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Cerrar sesión',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancelar' }),
        expect.objectContaining({ text: 'Cerrar sesión' }),
      ]),
    );
    expect(cerrarSesion).not.toHaveBeenCalled();
  });

  it('cierra sesión al confirmar', async () => {
    const user = userEvent.setup();
    await render(<Perfil />);
    await user.press(screen.getByText('Cerrar sesión'));
    const botones = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; onPress?: () => void }[];
    const confirmar = botones.find((b) => b.text === 'Cerrar sesión');
    await confirmar?.onPress?.();
    expect(cerrarSesion).toHaveBeenCalledTimes(1);
  });
});
