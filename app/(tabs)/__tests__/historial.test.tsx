import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Historial from '../historial';
import { useHistorial } from '../../../src/features/transacciones/useHistorial';
import { useCajas } from '../../../src/features/cajas/useCajas';
import { borrarTransaccion } from '../../../src/features/transacciones/transaccionesService';
import { useSessionStore } from '../../../src/stores/sessionStore';
import { formatearFecha } from '../../../src/utils/fecha';
import { formatearMoneda } from '../../../src/utils/dinero';

// Se mockea `expo-router` para poder espiar `router.push` (navegación a
// editar) sin depender de un Stack real montado en el test.
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Se mockea `useHistorial` (capa de datos en tiempo real de Firestore) para no
// depender del emulador: solo se necesita una lista fija de transacciones
// para poder interactuar con una fila. `filtrarHistorial`/`rangoFecha` NO se
// mockean: son funciones puras y se ejercitan de verdad para probar el
// filtrado en la pantalla.
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

const cajaA = {
  id: 'c1', nombre: 'Gastos', porcentaje: 50, saldo: 0, esPorDefecto: true, orden: 0, createdAt: 1,
};
const cajaB = {
  id: 'c2', nombre: 'Ahorro', porcentaje: 50, saldo: 0, esPorDefecto: true, orden: 1, createdAt: 1,
};

const itemsMock = [
  {
    id: 'tx1', tipo: 'egreso' as const, monto: 5000, fecha: 2, descripcion: 'Mercado', cajaId: 'c1', reparto: [], createdAt: 2,
  },
];

describe('Historial', () => {
  const push = jest.fn();
  const setParams = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, setParams });
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (useHistorial as jest.Mock).mockReturnValue({ items: itemsMock, cargando: false });
    (useCajas as jest.Mock).mockReturnValue({ cajas: [] });
    useSessionStore.setState({
      usuario: {
        uid: 'u1', email: null, displayName: null, monedaPreferida: 'COP', createdAt: 1,
      },
      cargando: false,
    });
    jest.spyOn(Alert, 'alert');
  });

  it('tocar una fila (tap corto) navega a editar ese movimiento', async () => {
    await render(<Historial />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Mercado'));

    expect(push).toHaveBeenCalledWith('/transaccion/nueva?editId=tx1');
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
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA] });

    await render(<Historial />);

    expect(screen.getByText(`Gastos · ${formatearFecha(2)}`)).toBeTruthy();
  });

  it('sin movimientos muestra el mensaje de estado vacío', async () => {
    (useHistorial as jest.Mock).mockReturnValue({ items: [], cargando: false });

    await render(<Historial />);

    expect(screen.getByText('Aún no tienes movimientos')).toBeTruthy();
    expect(screen.queryByText('Mercado')).toBeNull();
  });

  it('muestra chips de rango de fecha además de los chips de caja', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });

    await render(<Historial />);

    expect(screen.getByText('Todo')).toBeTruthy();
    expect(screen.getByText('Este mes')).toBeTruthy();
    expect(screen.getByText('Mes pasado')).toBeTruthy();
    expect(screen.getByText('Este año')).toBeTruthy();
    expect(screen.getByText('Todas')).toBeTruthy();
    expect(screen.getByText('Gastos')).toBeTruthy();
    expect(screen.getByText('Ahorro')).toBeTruthy();
  });

  it(
    'el filtro por caja incluye ingresos cuyo reparto tocó esa caja '
    + '(IMP-4) y excluye movimientos de otras cajas',
    async () => {
      (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
      (useHistorial as jest.Mock).mockReturnValue({
        items: [
          {
            id: 'ingreso-1', tipo: 'ingreso', monto: 10000, fecha: 3, descripcion: 'Sueldo', cajaId: null, reparto: [{ cajaId: 'c1', monto: 5000 }, { cajaId: 'c2', monto: 5000 }], createdAt: 3,
          },
          {
            id: 'egreso-c1', tipo: 'egreso', monto: 1000, fecha: 2, descripcion: 'Mercado', cajaId: 'c1', reparto: [], createdAt: 2,
          },
          {
            id: 'egreso-c2', tipo: 'egreso', monto: 2000, fecha: 1, descripcion: 'Ropa', cajaId: 'c2', reparto: [], createdAt: 1,
          },
        ],
        cargando: false,
      });
      const user = userEvent.setup();

      await render(<Historial />);
      await user.press(screen.getByText('Gastos'));

      expect(screen.getByText('Sueldo')).toBeTruthy();
      expect(screen.getByText('Mercado')).toBeTruthy();
      expect(screen.queryByText('Ropa')).toBeNull();
    },
  );

  it('cuando el filtro no arroja resultados muestra un mensaje distinto al de historial vacío', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [
        {
          id: 'egreso-c2', tipo: 'egreso', monto: 2000, fecha: 1, descripcion: 'Ropa', cajaId: 'c2', reparto: [], createdAt: 1,
        },
      ],
      cargando: false,
    });
    const user = userEvent.setup();

    await render(<Historial />);
    await user.press(screen.getByText('Gastos'));

    // Sí hay movimientos (Ropa en c2), pero el filtro por Gastos los oculta:
    // el mensaje debe distinguirse del "historial realmente vacío".
    expect(screen.getByText('No hay movimientos con estos filtros')).toBeTruthy();
    expect(screen.queryByText('Aún no tienes movimientos')).toBeNull();
    expect(screen.queryByText('Ropa')).toBeNull();
  });

  const ingresoRepartido = {
    id: 'i1', tipo: 'ingreso' as const, monto: 100000, fecha: 3, descripcion: 'Sueldo',
    cajaId: null, reparto: [{ cajaId: 'c1', monto: 30000 }, { cajaId: 'c2', monto: 70000 }], createdAt: 3,
  };

  it('muestra el control de tipo con las tres opciones', async () => {
    await render(<Historial />);

    expect(screen.getByText('Todos')).toBeTruthy();
    expect(screen.getByText('Ingresos')).toBeTruthy();
    expect(screen.getByText('Egresos')).toBeTruthy();
  });

  it('filtrar por Ingresos oculta los egresos', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [ingresoRepartido, itemsMock[0]],
      cargando: false,
    });
    const user = userEvent.setup();

    await render(<Historial />);
    await user.press(screen.getByText('Ingresos'));

    expect(screen.getByText('Sueldo')).toBeTruthy();
    expect(screen.queryByText('Mercado')).toBeNull();
  });

  it('filtrar por Egresos oculta los ingresos', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [ingresoRepartido, itemsMock[0]],
      cargando: false,
    });
    const user = userEvent.setup();

    await render(<Historial />);
    await user.press(screen.getByText('Egresos'));

    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.queryByText('Sueldo')).toBeNull();
  });

  it(
    'al filtrar por una caja, un ingreso repartido muestra la porción que entró '
    + 'a esa caja y no el monto total',
    async () => {
      (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
      (useHistorial as jest.Mock).mockReturnValue({ items: [ingresoRepartido], cargando: false });
      const user = userEvent.setup();

      await render(<Historial />);
      // Sin filtro: el movimiento vale su 100%.
      expect(screen.getByText(`+${formatearMoneda(100000)}`)).toBeTruthy();

      await user.press(screen.getByText('Gastos'));

      // Con filtro de caja: solo la porción del reparto (30%).
      expect(screen.getByText(`+${formatearMoneda(30000)}`)).toBeTruthy();
      expect(screen.queryByText(`+${formatearMoneda(100000)}`)).toBeNull();
      expect(screen.getByText(`de ${formatearMoneda(100000)} · 30%`)).toBeTruthy();
    },
  );

  it('el desglose se expande sin navegar a editar', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({ items: [ingresoRepartido], cargando: false });
    const user = userEvent.setup();

    await render(<Historial />);
    await user.press(screen.getByLabelText('Ver reparto'));

    expect(screen.getByText(formatearMoneda(30000))).toBeTruthy();
    expect(screen.getByText(formatearMoneda(70000))).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('el parámetro tipo=ingreso deja el historial filtrado por ingresos', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ tipo: 'ingreso' });
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [ingresoRepartido, itemsMock[0]],
      cargando: false,
    });

    await render(<Historial />);

    expect(screen.getByText('Sueldo')).toBeTruthy();
    expect(screen.queryByText('Mercado')).toBeNull();
  });

  it('el parámetro se consume una sola vez para no pisar los filtros manuales', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ tipo: 'ingreso' });
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });

    await render(<Historial />);

    // Sin este limpiado, el parámetro queda pegado a la ruta del tab y vuelve
    // a forzar el filtro cada vez que el usuario regrese desde otro tab.
    expect(setParams).toHaveBeenCalledWith({ tipo: undefined });
  });

  it('sin parámetro no se toca el filtro ni se limpia la ruta', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [ingresoRepartido, itemsMock[0]],
      cargando: false,
    });

    await render(<Historial />);

    expect(screen.getByText('Sueldo')).toBeTruthy();
    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(setParams).not.toHaveBeenCalled();
  });
});
