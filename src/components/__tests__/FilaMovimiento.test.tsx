import { render, screen, userEvent, within } from '@testing-library/react-native';
import { FilaMovimiento } from '../FilaMovimiento';
import { formatearMoneda } from '../../utils/dinero';
import { MovimientoVista } from '../../features/transacciones/vistaHistorial';

const ingreso = {
  id: 'i1', tipo: 'ingreso' as const, monto: 100000, fecha: 3, descripcion: 'Sueldo',
  cajaId: null, reparto: [{ cajaId: 'c1', monto: 30000 }, { cajaId: 'c2', monto: 70000 }], createdAt: 3,
};

/** Vista tal como la produce `proyectarHistorial` con filtro de caja c1. */
const vistaParcial: MovimientoVista = {
  tx: ingreso,
  montoEfectivo: 30000,
  esParcial: true,
  porcentaje: 30,
  subtitulo: 'Gastos',
  desglose: [],
};

/** Vista tal como la produce `proyectarHistorial` sin filtro de caja. */
const vistaCompleta: MovimientoVista = {
  tx: ingreso,
  montoEfectivo: 100000,
  esParcial: false,
  porcentaje: null,
  subtitulo: '2 cajas',
  desglose: [
    { cajaId: 'c1', nombre: 'Gastos', monto: 30000 },
    { cajaId: 'c2', nombre: 'Ahorros', monto: 70000 },
  ],
};

const props = {
  expandido: false,
  onToggle: jest.fn(),
  onEditar: jest.fn(),
  onBorrar: jest.fn(),
};

describe('FilaMovimiento', () => {
  beforeEach(() => jest.clearAllMocks());

  it('con una vista parcial pinta la porción como monto principal', async () => {
    await render(<FilaMovimiento {...props} vista={vistaParcial} />);

    expect(screen.getByText(`+${formatearMoneda(30000)}`)).toBeTruthy();
    expect(screen.queryByText(`+${formatearMoneda(100000)}`)).toBeNull();
  });

  it('con una vista parcial muestra el total y el porcentaje como contexto', async () => {
    await render(<FilaMovimiento {...props} vista={vistaParcial} />);

    expect(screen.getByText(`de ${formatearMoneda(100000)} · 30%`)).toBeTruthy();
  });

  it('con una vista completa pinta el total y no muestra línea de contexto', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);

    expect(screen.getByText(`+${formatearMoneda(100000)}`)).toBeTruthy();
    expect(screen.queryByText(/^de /)).toBeNull();
  });

  it('un egreso se pinta con signo negativo', async () => {
    const egresoVista: MovimientoVista = {
      tx: { id: 'e1', tipo: 'egreso', monto: 5000, fecha: 2, descripcion: 'Mercado', cajaId: 'c1', reparto: [], createdAt: 2 },
      montoEfectivo: 5000, esParcial: false, porcentaje: null, subtitulo: 'Gastos', desglose: [],
    };

    await render(<FilaMovimiento {...props} vista={egresoVista} />);

    expect(screen.getByText(`-${formatearMoneda(5000)}`)).toBeTruthy();
  });

  it('sin desglose no muestra el chevron', async () => {
    await render(<FilaMovimiento {...props} vista={vistaParcial} />);

    expect(screen.queryByTestId('chevron')).toBeNull();
  });

  it('con desglose, tocar la fila alterna el reparto sin abrir la edición', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);
    const user = userEvent.setup();

    await user.press(screen.getByTestId('fila-pressable'));

    expect(props.onToggle).toHaveBeenCalledWith('i1');
    expect(props.onEditar).not.toHaveBeenCalled();
  });

  it('sin desglose, tocar la fila abre la edición', async () => {
    await render(<FilaMovimiento {...props} vista={vistaParcial} />);
    const user = userEvent.setup();

    await user.press(screen.getByTestId('fila-pressable'));

    expect(props.onEditar).toHaveBeenCalledWith('i1');
    expect(props.onToggle).not.toHaveBeenCalled();
  });

  it.each([
    ['con desglose', vistaCompleta],
    ['sin desglose', vistaParcial],
  ])('mantener pulsada una fila %s borra', async (_caso, vista) => {
    await render(<FilaMovimiento {...props} vista={vista} />);
    const user = userEvent.setup();

    await user.longPress(screen.getByTestId('fila-pressable'));

    expect(props.onBorrar).toHaveBeenCalledWith('i1');
  });

  it('colapsada no muestra las cajas del reparto', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);

    expect(screen.queryByText('Ahorros')).toBeNull();
  });

  it('expandida lista cada caja con su porción', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} expandido />);

    expect(screen.getByText('Gastos')).toBeTruthy();
    expect(screen.getByText('Ahorros')).toBeTruthy();
    expect(screen.getByText(formatearMoneda(30000))).toBeTruthy();
    expect(screen.getByText(formatearMoneda(70000))).toBeTruthy();
  });

  it('desde el panel expandido se abre la edición', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} expandido />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Editar'));

    expect(props.onEditar).toHaveBeenCalledWith('i1');
  });

  it('desde el panel expandido se borra el movimiento', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} expandido />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Borrar'));

    expect(props.onBorrar).toHaveBeenCalledWith('i1');
  });

  it('colapsada no ofrece las acciones del panel', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);

    expect(screen.queryByText('Editar')).toBeNull();
    expect(screen.queryByText('Borrar')).toBeNull();
  });

  it('una fila expandible anuncia su estado a los lectores de pantalla', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} expandido />);

    expect(screen.getByTestId('fila-pressable').props.accessibilityState.expanded).toBe(true);
  });

  it('una fila sin desglose no se anuncia como expandible', async () => {
    // `expanded: false` haría que el lector de pantalla prometiera un
    // desplegable que esta fila no tiene: al tocarla se abre la edición.
    await render(<FilaMovimiento {...props} vista={vistaParcial} />);

    expect(screen.getByTestId('fila-pressable').props.accessibilityState?.expanded).toBeUndefined();
  });

  it('el chevron vive dentro del Pressable de la fila', async () => {
    // Ya no es un botón hermano: la fila entera es el disparador del
    // desplegable, así que el chevron pasa a ser un indicador decorativo
    // dentro de ella y no debe capturar el toque por su cuenta.
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);

    const fila = screen.getByTestId('fila-pressable');

    expect(within(fila).getByTestId('chevron')).toBeTruthy();
  });

  it('con desglose vacío no renderiza el contenedor aunque expandido sea true', async () => {
    // Puede pasar en la integración: se expande el reparto de un ingreso y
    // luego se filtra por una caja que ese ingreso no tocó. `desglose` pasa a
    // `[]` pero el id sigue en el Set de expandidos de la pantalla. Sin este
    // guard queda un separador huérfano (la raya del borde y el aire debajo)
    // que el usuario no puede cerrar porque el chevron ya no se muestra.
    const sinDesglose: MovimientoVista = { ...vistaCompleta, desglose: [] };

    await render(<FilaMovimiento {...props} vista={sinDesglose} expandido />);

    expect(screen.queryByTestId('desglose')).toBeNull();
  });

  it('con porcentaje nulo no renderiza "null%" ni "NaN%"', async () => {
    const sinPorcentaje: MovimientoVista = { ...vistaParcial, porcentaje: null };

    await render(<FilaMovimiento {...props} vista={sinPorcentaje} />);

    expect(screen.getByText(`de ${formatearMoneda(100000)}`)).toBeTruthy();
    expect(screen.queryByText(/null|NaN/)).toBeNull();
  });
});
