import { generarMovimientosDemo } from '../generarDemo';
import { repartirIngreso } from '../../../utils/reparto';

const CAJAS = [
  { id: 'caja-gastos', nombre: 'Gastos', porcentaje: 50 },
  { id: 'caja-inversion', nombre: 'Inversión', porcentaje: 20 },
  { id: 'caja-ahorro', nombre: 'Ahorro', porcentaje: 30 },
];

// 24 de agosto de 2026, 12:00 UTC
const HASTA = Date.UTC(2026, 7, 24, 12, 0, 0);

function generar(over: Partial<Parameters<typeof generarMovimientosDemo>[0]> = {}) {
  return generarMovimientosDemo({
    cajas: CAJAS,
    cantidad: 30,
    hasta: HASTA,
    meses: 3,
    semilla: 42,
    ...over,
  });
}

const DIA = 24 * 60 * 60 * 1000;

test('genera la cantidad de movimientos pedida', () => {
  expect(generar()).toHaveLength(30);
});

test('mezcla ingresos y egresos', () => {
  const movs = generar();
  const ingresos = movs.filter((m) => m.tipo === 'ingreso');
  const egresos = movs.filter((m) => m.tipo === 'egreso');

  expect(ingresos.length).toBeGreaterThan(0);
  expect(egresos.length).toBeGreaterThan(0);
});

test('los egresos salen de una caja existente y los ingresos no llevan caja', () => {
  const movs = generar();
  const ids = CAJAS.map((c) => c.id);

  for (const m of movs) {
    if (m.tipo === 'egreso') {
      expect(ids).toContain(m.cajaId);
    } else {
      expect(m.cajaId).toBeNull();
    }
  }
});

test('reparte las fechas por toda la ventana sin salirse de ella', () => {
  const movs = generar();
  const fechas = movs.map((m) => m.fecha);
  const ventana = 3 * 30 * DIA;

  expect(Math.min(...fechas)).toBeGreaterThanOrEqual(HASTA - ventana);
  expect(Math.max(...fechas)).toBeLessThanOrEqual(HASTA);
  // cubre buena parte de la ventana en vez de agolparse en pocos días
  expect(Math.max(...fechas) - Math.min(...fechas)).toBeGreaterThan(ventana * 0.7);
});

test('ningún egreso deja la caja en negativo', () => {
  const movs = generar();
  const saldos: Record<string, number> = Object.fromEntries(CAJAS.map((c) => [c.id, 0]));

  for (const m of movs) {
    if (m.tipo === 'ingreso') {
      for (const p of repartirIngreso(m.monto, CAJAS)) {
        saldos[p.cajaId] += p.monto;
      }
    } else {
      saldos[m.cajaId!] -= m.monto;
      expect(saldos[m.cajaId!]).toBeGreaterThanOrEqual(0);
    }
  }
});
