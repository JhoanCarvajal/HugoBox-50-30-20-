import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import GestionCajas from '../cajas';
import { useCajas } from '../../src/features/cajas/useCajas';
import { crearCaja, actualizarPorcentajes } from '../../src/features/cajas/cajasService';
import { useSessionStore } from '../../src/stores/sessionStore';

// Se mockea `expo-router` porque la pantalla usa `router.back()` en el botón
// "Volver" y no hay un Stack real montado en el test.
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// Se mockea `useCajas` (capa de datos en tiempo real de Firestore) para no
// depender del emulador: solo se necesita una lista fija de cajas.
jest.mock('../../src/features/cajas/useCajas', () => ({
  useCajas: jest.fn(),
}));

// Se mockea el servicio para espiar `crearCaja`/`actualizarPorcentajes` sin
// tocar Firestore: la pantalla debe llamar a la capa de servicios (nunca
// Firestore directo), y aquí se ancla el invariante de que la validación de
// suma=100 vive en el servicio (la pantalla captura y muestra su error).
jest.mock('../../src/features/cajas/cajasService', () => ({
  crearCaja: jest.fn(),
  actualizarPorcentajes: jest.fn(),
}));

const cajasMock = [
  {
    id: 'c1', nombre: 'Gastos', porcentaje: 50, saldo: 10000, esPorDefecto: true, orden: 0, createdAt: 1,
  },
  {
    id: 'c2', nombre: 'Inversión', porcentaje: 20, saldo: 5000, esPorDefecto: true, orden: 1, createdAt: 1,
  },
  {
    id: 'c3', nombre: 'Ahorro', porcentaje: 30, saldo: 2000, esPorDefecto: true, orden: 2, createdAt: 1,
  },
];

describe('Gestión de cajas', () => {
  const back = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ back });
    (useCajas as jest.Mock).mockReturnValue({ cajas: cajasMock, cargando: false });
    useSessionStore.setState({
      usuario: {
        uid: 'u1', email: null, displayName: null, monedaPreferida: 'COP', createdAt: 1,
      },
      cargando: false,
    });
    jest.spyOn(Alert, 'alert');
  });

  it('editar % que sí suman 100 y guardar llama a actualizarPorcentajes con los cambios correctos', async () => {
    (actualizarPorcentajes as jest.Mock).mockResolvedValue(undefined);
    await render(<GestionCajas />);
    const user = userEvent.setup();

    // 50/20/30 -> 40/30/30 (sigue sumando 100)
    await user.clear(screen.getByTestId('pct-c1'));
    await user.type(screen.getByTestId('pct-c1'), '40');
    await user.clear(screen.getByTestId('pct-c2'));
    await user.type(screen.getByTestId('pct-c2'), '30');

    await user.press(screen.getByText('Guardar %'));

    expect(actualizarPorcentajes).toHaveBeenCalledWith('u1', [
      { id: 'c1', porcentaje: 40 },
      { id: 'c2', porcentaje: 30 },
      { id: 'c3', porcentaje: 30 },
    ]);
  });

  it('editar % que NO suman 100 muestra el mensaje de suma del servicio', async () => {
    const error = new Error('La suma de los porcentajes debe ser 100, pero es 90');
    (actualizarPorcentajes as jest.Mock).mockRejectedValue(error);
    await render(<GestionCajas />);
    const user = userEvent.setup();

    // 50/20/30 -> 40/20/30 = 90 (no suma 100)
    await user.clear(screen.getByTestId('pct-c1'));
    await user.type(screen.getByTestId('pct-c1'), '40');

    await user.press(screen.getByText('Guardar %'));

    expect(actualizarPorcentajes).toHaveBeenCalledWith('u1', [
      { id: 'c1', porcentaje: 40 },
      { id: 'c2', porcentaje: 20 },
      { id: 'c3', porcentaje: 30 },
    ]);
    expect(await screen.findByText('La suma de los porcentajes debe ser 100, pero es 90')).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith('Revisa los %', 'La suma de los porcentajes debe ser 100, pero es 90');
  });

  it('crear una caja nueva válida llama a crearCaja con los argumentos correctos', async () => {
    (crearCaja as jest.Mock).mockResolvedValue('nuevo-id');
    await render(<GestionCajas />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Nombre'), 'Emergencias');
    await user.type(screen.getByPlaceholderText('Porcentaje'), '0');
    await user.press(screen.getByText('Agregar caja'));

    expect(crearCaja).toHaveBeenCalledWith('u1', { nombre: 'Emergencias', porcentaje: 0 }, [50, 20, 30]);
  });
});
