import { Transaccion } from '../../../types/models';
import { filtrarHistorial, rangoFecha } from '../filtros';

function tx(overrides: Partial<Transaccion> & Pick<Transaccion, 'id'>): Transaccion {
  return {
    tipo: 'egreso',
    monto: 100,
    fecha: 0,
    descripcion: '',
    cajaId: null,
    reparto: [],
    createdAt: 0,
    ...overrides,
  };
}

describe('filtrarHistorial', () => {
  it(
    'filtro por caja incluye egresos de esa caja e ingresos cuyo reparto la toca '
    + '(IMP-4: los ingresos no deben "desaparecer" solo por guardarse con cajaId:null)',
    () => {
      const items: Transaccion[] = [
        tx({
          id: 'ingreso-reparte-a-y-b',
          tipo: 'ingreso',
          cajaId: null,
          reparto: [{ cajaId: 'A', monto: 50 }, { cajaId: 'B', monto: 50 }],
        }),
        tx({ id: 'egreso-a', tipo: 'egreso', cajaId: 'A' }),
        tx({ id: 'egreso-b', tipo: 'egreso', cajaId: 'B' }),
        tx({
          id: 'ingreso-solo-b', tipo: 'ingreso', cajaId: null, reparto: [{ cajaId: 'B', monto: 100 }],
        }),
      ];

      const resultado = filtrarHistorial(items, { cajaId: 'A' });

      expect(resultado.map((t) => t.id).sort()).toEqual(['egreso-a', 'ingreso-reparte-a-y-b'].sort());
    },
  );

  it('sin filtros devuelve todos los items', () => {
    const items = [tx({ id: '1' }), tx({ id: '2' })];
    expect(filtrarHistorial(items, {})).toEqual(items);
  });

  it('cajaId undefined o null no filtra por caja (equivalente a "Todas")', () => {
    const items = [tx({ id: '1', cajaId: 'A' }), tx({ id: '2', cajaId: 'B' })];
    expect(filtrarHistorial(items, { cajaId: undefined })).toHaveLength(2);
    expect(filtrarHistorial(items, { cajaId: null })).toHaveLength(2);
  });

  it('filtra por rango de fecha (desde/hasta)', () => {
    const items = [
      tx({ id: 'vieja', fecha: 100 }),
      tx({ id: 'en-rango-desde', fecha: 200 }),
      tx({ id: 'en-rango-medio', fecha: 500 }),
      tx({ id: 'en-rango-hasta', fecha: 800 }),
      tx({ id: 'nueva', fecha: 900 }),
    ];
    const resultado = filtrarHistorial(items, { desde: 200, hasta: 800 });
    expect(resultado.map((t) => t.id)).toEqual(['en-rango-desde', 'en-rango-medio', 'en-rango-hasta']);
  });

  it('desde y hasta se pueden usar de forma independiente', () => {
    const items = [tx({ id: '1', fecha: 100 }), tx({ id: '2', fecha: 500 }), tx({ id: '3', fecha: 900 })];
    expect(filtrarHistorial(items, { desde: 500 }).map((t) => t.id)).toEqual(['2', '3']);
    expect(filtrarHistorial(items, { hasta: 500 }).map((t) => t.id)).toEqual(['1', '2']);
  });

  it('combina filtro de caja y fecha con AND', () => {
    const items = [
      tx({
        id: 'a-en-rango', cajaId: 'A', fecha: 500,
      }),
      tx({
        id: 'a-fuera-rango', cajaId: 'A', fecha: 5000,
      }),
      tx({
        id: 'b-en-rango', cajaId: 'B', fecha: 500,
      }),
    ];
    const resultado = filtrarHistorial(items, { cajaId: 'A', desde: 100, hasta: 1000 });
    expect(resultado.map((t) => t.id)).toEqual(['a-en-rango']);
  });

  it('no muta el array de entrada', () => {
    const items = [tx({ id: '1', cajaId: 'A' }), tx({ id: '2', cajaId: 'B' })];
    const copia = items.map((t) => ({ ...t }));

    const resultado = filtrarHistorial(items, { cajaId: 'A' });

    expect(items).toEqual(copia);
    expect(items.length).toBe(2);
    expect(resultado).not.toBe(items);
  });

  describe('filtrarHistorial · filtro por tipo', () => {
    const ingreso = {
      id: 'i1', tipo: 'ingreso' as const, monto: 100000, fecha: 3, descripcion: 'Sueldo',
      cajaId: null, reparto: [{ cajaId: 'c1', monto: 30000 }, { cajaId: 'c2', monto: 70000 }], createdAt: 3,
    };
    const egreso = {
      id: 'e1', tipo: 'egreso' as const, monto: 5000, fecha: 2, descripcion: 'Mercado',
      cajaId: 'c1', reparto: [], createdAt: 2,
    };
    const items = [ingreso, egreso];

    it('con tipo "ingreso" deja solo los ingresos', () => {
      expect(filtrarHistorial(items, { tipo: 'ingreso' }).map((t) => t.id)).toEqual(['i1']);
    });

    it('con tipo "egreso" deja solo los egresos', () => {
      expect(filtrarHistorial(items, { tipo: 'egreso' }).map((t) => t.id)).toEqual(['e1']);
    });

    it('con tipo null no descarta nada (equivale a "todos")', () => {
      expect(filtrarHistorial(items, { tipo: null }).map((t) => t.id)).toEqual(['i1', 'e1']);
    });

    it('sin la clave tipo tampoco descarta nada', () => {
      expect(filtrarHistorial(items, {}).map((t) => t.id)).toEqual(['i1', 'e1']);
    });

    it('combina tipo con caja: un egreso de otra caja queda fuera', () => {
      const egresoOtraCaja = { ...egreso, id: 'e2', cajaId: 'c2' };
      const resultado = filtrarHistorial([...items, egresoOtraCaja], { tipo: 'egreso', cajaId: 'c1' });
      expect(resultado.map((t) => t.id)).toEqual(['e1']);
    });

    it('combina tipo con caja: el ingreso que tocó esa caja sobrevive al filtro de ingresos', () => {
      const resultado = filtrarHistorial(items, { tipo: 'ingreso', cajaId: 'c1' });
      expect(resultado.map((t) => t.id)).toEqual(['i1']);
    });
  });
});

describe('rangoFecha', () => {
  it('"todo" no acota fechas', () => {
    expect(rangoFecha('todo', Date.now())).toEqual({ desde: null, hasta: null });
  });

  it('"mes" cubre desde el 1 del mes de "ahora" (00:00:00.000) hasta el último día (23:59:59.999)', () => {
    const ahora = new Date(2026, 5, 30, 10, 0, 0).getTime(); // 30 jun 2026, 10:00am

    const { desde, hasta } = rangoFecha('mes', ahora);

    expect(desde).toBe(new Date(2026, 5, 1, 0, 0, 0, 0).getTime());
    expect(hasta).toBe(new Date(2026, 6, 0, 23, 59, 59, 999).getTime()); // día 0 de julio = 30 jun 23:59:59.999
    expect(desde).toBeLessThanOrEqual(ahora);
    expect(hasta).toBeGreaterThanOrEqual(ahora);
  });

  it('"mesPasado" cubre el mes calendario inmediatamente anterior, completo', () => {
    const ahora = new Date(2026, 5, 15).getTime(); // 15 jun 2026

    const { desde, hasta } = rangoFecha('mesPasado', ahora);

    expect(desde).toBe(new Date(2026, 4, 1, 0, 0, 0, 0).getTime()); // 1 may 2026
    expect(hasta).toBe(new Date(2026, 5, 0, 23, 59, 59, 999).getTime()); // 31 may 2026 23:59:59.999
    expect(hasta).toBeLessThan(ahora);
  });

  it('"mesPasado" cruza el año correctamente (enero -> diciembre del año anterior)', () => {
    const ahora = new Date(2026, 0, 10).getTime(); // 10 ene 2026

    const { desde, hasta } = rangoFecha('mesPasado', ahora);

    expect(desde).toBe(new Date(2025, 11, 1, 0, 0, 0, 0).getTime());
    expect(hasta).toBe(new Date(2025, 11, 31, 23, 59, 59, 999).getTime());
  });

  it('"anio" cubre desde el 1 de enero hasta el 31 de diciembre del año de "ahora"', () => {
    const ahora = new Date(2026, 5, 30).getTime();

    const { desde, hasta } = rangoFecha('anio', ahora);

    expect(desde).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime());
    expect(hasta).toBe(new Date(2026, 11, 31, 23, 59, 59, 999).getTime());
  });
});
