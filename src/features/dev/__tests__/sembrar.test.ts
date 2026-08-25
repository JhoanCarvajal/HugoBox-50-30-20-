import { MovimientoDemo } from '../generarDemo';
import { sembrarMovimientos, ServiciosSiembra } from '../sembrar';

const UID = 'uid-prueba';

function movimiento(over: Partial<MovimientoDemo> = {}): MovimientoDemo {
  return {
    tipo: 'ingreso',
    monto: 100_000,
    descripcion: 'Salario quincena',
    fecha: Date.UTC(2026, 5, 1),
    cajaId: null,
    ...over,
  };
}

/** Doble en memoria: registra las llamadas tal como llegarían a Firestore. */
function serviciosFalsos() {
  const llamadas: { metodo: 'ingreso' | 'egreso'; uid: string; datos: unknown }[] = [];
  const servicios: ServiciosSiembra = {
    agregarIngreso: async (uid, datos) => {
      llamadas.push({ metodo: 'ingreso', uid, datos });
    },
    agregarEgreso: async (uid, datos) => {
      llamadas.push({ metodo: 'egreso', uid, datos });
    },
  };
  return { llamadas, servicios };
}

test('crea cada movimiento con el servicio que le corresponde', async () => {
  const { llamadas, servicios } = serviciosFalsos();
  const movs = [
    movimiento({ tipo: 'ingreso' }),
    movimiento({ tipo: 'egreso', cajaId: 'caja-gastos', monto: 25_000 }),
  ];

  await sembrarMovimientos(UID, movs, { servicios });

  expect(llamadas.map((l) => l.metodo)).toEqual(['ingreso', 'egreso']);
  expect(llamadas[0].datos).toMatchObject({ monto: 100_000, descripcion: 'Salario quincena' });
  expect(llamadas[1].datos).toMatchObject({ monto: 25_000, cajaId: 'caja-gastos' });
  expect(llamadas.every((l) => l.uid === UID)).toBe(true);
});

test('devuelve cuántos movimientos creó', async () => {
  const { servicios } = serviciosFalsos();
  const movs = [movimiento(), movimiento({ tipo: 'egreso', cajaId: 'c1' }), movimiento()];

  await expect(sembrarMovimientos(UID, movs, { servicios })).resolves.toBe(3);
});

test('informa el progreso tras cada movimiento creado', async () => {
  const { servicios } = serviciosFalsos();
  const movs = [movimiento(), movimiento({ tipo: 'egreso', cajaId: 'c1' }), movimiento()];
  const progreso: [number, number][] = [];

  await sembrarMovimientos(UID, movs, {
    servicios,
    onProgreso: (hechos, total) => progreso.push([hechos, total]),
  });

  expect(progreso).toEqual([
    [1, 3],
    [2, 3],
    [3, 3],
  ]);
});
