import { proyectarHistorial } from '../vistaHistorial';

const cajas = [
  { id: 'c1', nombre: 'Gastos', porcentaje: 30, saldo: 0, esPorDefecto: true, orden: 0, createdAt: 1 },
  { id: 'c2', nombre: 'Ahorros', porcentaje: 70, saldo: 0, esPorDefecto: true, orden: 1, createdAt: 1 },
];

// Ingreso de $1.000,00 repartido 30/70 entre Gastos y Ahorros.
const ingreso = {
  id: 'i1', tipo: 'ingreso' as const, monto: 100000, fecha: 3, descripcion: 'Sueldo',
  cajaId: null, reparto: [{ cajaId: 'c1', monto: 30000 }, { cajaId: 'c2', monto: 70000 }], createdAt: 3,
};

const egreso = {
  id: 'e1', tipo: 'egreso' as const, monto: 5000, fecha: 2, descripcion: 'Mercado',
  cajaId: 'c1', reparto: [], createdAt: 2,
};

describe('proyectarHistorial · con filtro de caja (lente «impacto en caja»)', () => {
  it('un ingreso repartido muestra la porción de esa caja, no el total', () => {
    const [vista] = proyectarHistorial([ingreso], { cajaId: 'c1' }, cajas);

    expect(vista.montoEfectivo).toBe(30000);
    expect(vista.esParcial).toBe(true);
    expect(vista.porcentaje).toBe(30);
  });

  it('el porcentaje sale del reparto guardado, no del porcentaje actual de la caja', () => {
    // La caja c1 hoy está configurada al 30%, pero este ingreso viejo se
    // repartió cuando estaba al 80%: debe seguir mostrando 80%.
    const ingresoViejo = {
      ...ingreso,
      reparto: [{ cajaId: 'c1', monto: 80000 }, { cajaId: 'c2', monto: 20000 }],
    };

    const [vista] = proyectarHistorial([ingresoViejo], { cajaId: 'c1' }, cajas);

    expect(vista.porcentaje).toBe(80);
  });

  it('el subtítulo es el nombre de la caja filtrada', () => {
    const [vista] = proyectarHistorial([ingreso], { cajaId: 'c2' }, cajas);

    expect(vista.subtitulo).toBe('Ahorros');
  });

  it('un egreso sale íntegro de su caja: no es parcial', () => {
    const [vista] = proyectarHistorial([egreso], { cajaId: 'c1' }, cajas);

    expect(vista.montoEfectivo).toBe(5000);
    expect(vista.esParcial).toBe(false);
    expect(vista.porcentaje).toBeNull();
  });

  it('un ingreso que fue 100% a la caja filtrada no se marca como parcial', () => {
    const ingresoUnaCaja = { ...ingreso, reparto: [{ cajaId: 'c1', monto: 100000 }] };

    const [vista] = proyectarHistorial([ingresoUnaCaja], { cajaId: 'c1' }, cajas);

    expect(vista.esParcial).toBe(false);
    expect(vista.porcentaje).toBeNull();
  });

  it('no expone desglose cuando ya se está mirando una caja concreta', () => {
    const [vista] = proyectarHistorial([ingreso], { cajaId: 'c1' }, cajas);

    expect(vista.desglose).toEqual([]);
  });

  it('un monto de 0 no divide por cero', () => {
    const cero = { ...ingreso, monto: 0, reparto: [{ cajaId: 'c1', monto: 0 }] };

    const [vista] = proyectarHistorial([cero], { cajaId: 'c1' }, cajas);

    expect(vista.porcentaje).toBeNull();
    expect(vista.montoEfectivo).toBe(0);
  });

  it('un ingreso sin reparto proyecta 0 en vez de romperse', () => {
    // Dato defensivo: en la práctica `filtrarHistorial` ya excluye estos items
    // cuando hay caja filtrada, así que no deberían llegar hasta aquí.
    const sinReparto = { ...ingreso, reparto: [] };

    const [vista] = proyectarHistorial([sinReparto], { cajaId: 'c1' }, cajas);

    expect(vista.montoEfectivo).toBe(0);
    expect(vista.esParcial).toBe(true);
    expect(vista.porcentaje).toBe(0);
  });

  it('un ingreso con reparto de varias cajas donde una recibió 0 no se marca como parcial', () => {
    // repartirIngreso genera una entrada por caja activa, con monto 0 cuando el
    // redondeo deja sin nada a la caja minoritaria. La caja que se llevó todo
    // recibió el 100%, aunque el reparto tenga dos entradas.
    const casiTodo = { ...ingreso, monto: 3, reparto: [{ cajaId: 'c1', monto: 0 }, { cajaId: 'c2', monto: 3 }] };

    const [vista] = proyectarHistorial([casiTodo], { cajaId: 'c2' }, cajas);

    expect(vista.montoEfectivo).toBe(3);
    expect(vista.esParcial).toBe(false);
    expect(vista.porcentaje).toBeNull();
  });
});

describe('proyectarHistorial · sin filtro de caja (lente «movimiento»)', () => {
  it('el ingreso se muestra por su valor total', () => {
    const [vista] = proyectarHistorial([ingreso], {}, cajas);

    expect(vista.montoEfectivo).toBe(100000);
    expect(vista.esParcial).toBe(false);
    expect(vista.porcentaje).toBeNull();
  });

  it('expone el desglose del reparto con los nombres de las cajas', () => {
    const [vista] = proyectarHistorial([ingreso], {}, cajas);

    expect(vista.desglose).toEqual([
      { cajaId: 'c1', nombre: 'Gastos', monto: 30000 },
      { cajaId: 'c2', nombre: 'Ahorros', monto: 70000 },
    ]);
  });

  it('el subtítulo de un ingreso repartido cuenta las cajas en plural', () => {
    const [vista] = proyectarHistorial([ingreso], {}, cajas);

    expect(vista.subtitulo).toBe('2 cajas');
  });

  it('el subtítulo usa el singular cuando el reparto tocó una sola caja', () => {
    const ingresoUnaCaja = { ...ingreso, reparto: [{ cajaId: 'c1', monto: 100000 }] };

    const [vista] = proyectarHistorial([ingresoUnaCaja], {}, cajas);

    expect(vista.subtitulo).toBe('1 caja');
  });

  it('el subtítulo de un egreso es el nombre de su caja', () => {
    const [vista] = proyectarHistorial([egreso], {}, cajas);

    expect(vista.subtitulo).toBe('Gastos');
    expect(vista.desglose).toEqual([]);
  });

  it('una caja borrada no rompe el desglose', () => {
    const [vista] = proyectarHistorial([ingreso], {}, [cajas[0]]);

    expect(vista.desglose[1]).toEqual({ cajaId: 'c2', nombre: 'Caja eliminada', monto: 70000 });
  });

  it('con `cajas` aún vacío, un egreso no afirma "Caja eliminada"', () => {
    // `cajas: []` es el estado real mientras `useCajas` no ha resuelto su
    // primer snapshot (arranca en `[]`, igual que `useHistorial`, sin orden
    // garantizado entre ambos). No se sabe todavía si la caja existe: no se
    // debe afirmar que ya no existe.
    const [vista] = proyectarHistorial([egreso], {}, []);

    expect(vista.subtitulo).toBe('');
  });

  it('con `cajas` aún vacío, el desglose de un ingreso repartido no afirma "Caja eliminada" en ninguna entrada', () => {
    const [vista] = proyectarHistorial([ingreso], {}, []);

    expect(vista.desglose.map((d) => d.nombre)).toEqual(['', '']);
  });
});

describe('proyectarHistorial · contrato general', () => {
  it('no filtra: devuelve una vista por cada item recibido, en el mismo orden', () => {
    const vistas = proyectarHistorial([ingreso, egreso], {}, cajas);

    expect(vistas.map((v) => v.tx.id)).toEqual(['i1', 'e1']);
  });
});
