import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import Historial from '../historial';
import { useHistorial } from '../../../src/features/transacciones/useHistorial';
import { useCajas } from '../../../src/features/cajas/useCajas';
import { borrarTransaccion } from '../../../src/features/transacciones/transaccionesService';
import { useSessionStore } from '../../../src/stores/sessionStore';
import { formatearFecha } from '../../../src/utils/fecha';

// Se mockea `useHistorial` (capa de datos en tiempo real de Firestore) para no
// depender del emulador: solo se necesita una lista fija de transacciones
// para poder interactuar con una fila.
jest.mock('../../../src/features/transacciones/useHistorial', () => ({
  useHistorial: jest.fn(),
}));

// Se mockea `useCajas` por la misma razón (los chips de filtro los consumen).
jest.mock('../../../src/features/cajas/useCajas', () => ({
  useCajas: jest.fn(),
}));

// Se mockea el servicio para espiar la llamada real de borrado sin tocar
// Firestore: la pantalla debe llamar a la capa de servicios, no a Firestore
// directo.
jest.mock('../../../src/features/transacciones/transaccionesService', () => ({
  borrarTransaccion: jest.fn(),
}));

const itemsMock = [
  {
    id: 'tx1', tipo: 'egreso' as const, monto: 5000, fecha: 2, descripcion: 'Mercado', cajaId: 'c1', reparto: [], createdAt: 2,
  },
];

describe('Historial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHistorial as jest.Mock).mockReturnValue({ items: itemsMock });
    (useCajas as jest.Mock).mockReturnValue({ cajas: [] });
    useSessionStore.setState({
      usuario: {
        uid: 'u1', email: null, displayName: null, monedaPreferida: 'COP', createdAt: 1,
      },
      cargando: false,
    });
    jest.spyOn(Alert, 'alert');
  });

  it('mantener pulsado una fila muestra la confirmación de borrado', async () => {
    await render(<Historial />);
    const user = userEvent.setup();

    await user.longPress(screen.getByText('Mercado'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Borrar',
      '¿Eliminar este movimiento? Se revertirán los saldos.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancelar' }),
        expect.objectContaining({ text: 'Borrar', style: 'destructive' }),
      ]),
    );
  });

  it('confirmar el borrado llama al servicio borrarTransaccion (revierte saldos)', async () => {
    await render(<Historial />);
    const user = userEvent.setup();

    await user.longPress(screen.getByText('Mercado'));

    const botones = (Alert.alert as jest.Mock).mock.calls[0][2];
    const botonBorrar = botones.find((b: { text: string }) => b.text === 'Borrar');
    botonBorrar.onPress();

    expect(borrarTransaccion).toHaveBeenCalledWith('u1', 'tx1');
  });

  it('muestra la fecha del movimiento en la fila', async () => {
    await render(<Historial />);

    expect(screen.getByText(formatearFecha(2))).toBeTruthy();
  });

  it('sin movimientos muestra el mensaje de estado vacío', async () => {
    (useHistorial as jest.Mock).mockReturnValue({ items: [] });

    await render(<Historial />);

    expect(screen.getByText('Aún no tienes movimientos')).toBeTruthy();
    expect(screen.queryByText('Mercado')).toBeNull();
  });
});
