import { renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useSessionStore } from '../../../stores/sessionStore';
import { useTransacciones } from '../useTransacciones';
import { agregarEgreso, editarTransaccion } from '../transaccionesService';

// Se mockea el servicio (capa de datos) para probar el hook de forma unitaria,
// sin tocar Firestore/el emulador: así se puede ejercitar la rama de
// `advertenciaSaldo` sin depender de crear un saldo negativo real.
jest.mock('../transaccionesService', () => ({
  agregarIngreso: jest.fn(),
  agregarEgreso: jest.fn(),
  editarTransaccion: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({
    usuario: { uid: 'u1', email: null, displayName: null, monedaPreferida: 'COP', createdAt: 1 },
    cargando: false,
  });
});

describe('useTransacciones', () => {
  it('crearEgreso dispara Alert.alert cuando el servicio advierte saldo insuficiente', async () => {
    (agregarEgreso as jest.Mock).mockResolvedValue({ advertenciaSaldo: true });

    const { result } = await renderHook(() => useTransacciones());
    await result.current.crearEgreso(5000, 'caja1', 'compra');

    expect(agregarEgreso).toHaveBeenCalledWith('u1', {
      monto: 5000, cajaId: 'caja1', descripcion: 'compra', fecha: expect.any(Number),
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Saldo insuficiente',
      'Registramos el egreso, pero esta caja quedó en negativo.',
    );
  });

  it('crearEgreso no dispara Alert.alert cuando no hay advertencia de saldo', async () => {
    (agregarEgreso as jest.Mock).mockResolvedValue({ advertenciaSaldo: false });

    const { result } = await renderHook(() => useTransacciones());
    await result.current.crearEgreso(5000, 'caja1', 'compra');

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('editar llama a editarTransaccion con el uid y los datos recibidos', async () => {
    (editarTransaccion as jest.Mock).mockResolvedValue({ advertenciaSaldo: false });

    const { result } = await renderHook(() => useTransacciones());
    await result.current.editar('tx1', { monto: 5000, descripcion: 'ajuste', cajaId: 'caja1' });

    expect(editarTransaccion).toHaveBeenCalledWith('u1', 'tx1', {
      monto: 5000, descripcion: 'ajuste', cajaId: 'caja1',
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('editar dispara Alert.alert cuando el servicio advierte saldo insuficiente', async () => {
    (editarTransaccion as jest.Mock).mockResolvedValue({ advertenciaSaldo: true });

    const { result } = await renderHook(() => useTransacciones());
    await result.current.editar('tx1', { monto: 5000, descripcion: 'ajuste' });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Saldo insuficiente',
      'Registramos el egreso, pero esta caja quedó en negativo.',
    );
  });
});
