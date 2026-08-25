import { TipoMovimiento } from '../../types/models';
import { repartirIngreso } from '../../utils/reparto';

export interface CajaDemo {
  id: string;
  nombre: string;
  porcentaje: number; // 0..100, para simular el reparto de los ingresos
}

export interface MovimientoDemo {
  tipo: TipoMovimiento;
  monto: number; // positivo, en CENTAVOS enteros
  descripcion: string;
  fecha: number; // epoch ms
  cajaId: string | null; // egreso → caja origen; ingreso → null
}

export interface OpcionesDemo {
  cajas: CajaDemo[];
  cantidad: number;
  hasta: number; // epoch ms del último movimiento posible
  meses: number; // ventana hacia atrás desde `hasta`
  semilla: number; // determinismo
}

const DIA = 24 * 60 * 60 * 1000;

/** PRNG determinista (mulberry32): misma semilla → misma secuencia. */
function crearRandom(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generarMovimientosDemo(opciones: OpcionesDemo): MovimientoDemo[] {
  const { cajas, cantidad, hasta, meses, semilla } = opciones;
  const random = crearRandom(semilla);
  const ventana = meses * 30 * DIA;
  const desde = hasta - ventana;
  const paso = cantidad > 1 ? ventana / (cantidad - 1) : 0;

  // fechas primero, en orden: los saldos se simulan cronológicamente
  const fechas = Array.from({ length: cantidad }, (_, i) => {
    const base = desde + paso * i;
    const jitter = (random() - 0.5) * paso;
    return Math.round(Math.min(hasta, Math.max(desde, base + jitter)));
  }).sort((a, b) => a - b);

  const saldos: Record<string, number> = Object.fromEntries(cajas.map((c) => [c.id, 0]));

  return fechas.map((fecha, i) => {
    const conSaldo = cajas.filter((c) => saldos[c.id] > 0);
    // el primero es ingreso, y también cuando no hay de dónde gastar
    const esIngreso = i === 0 || conSaldo.length === 0 || random() < 0.35;

    if (esIngreso) {
      const monto = montoIngreso(random);
      for (const p of repartirIngreso(monto, cajas)) {
        saldos[p.cajaId] += p.monto;
      }
      return {
        tipo: 'ingreso' as TipoMovimiento,
        monto,
        descripcion: elegir(random, DESCRIPCIONES_INGRESO),
        fecha,
        cajaId: null,
      };
    }

    const caja = conSaldo[Math.floor(random() * conSaldo.length)];
    // gasta entre el 5% y el 40% del saldo disponible: nunca deja la caja en negativo
    const fraccion = 0.05 + random() * 0.35;
    const monto = Math.max(1, Math.round(saldos[caja.id] * fraccion));
    saldos[caja.id] -= monto;

    return {
      tipo: 'egreso' as TipoMovimiento,
      monto,
      descripcion: elegir(random, DESCRIPCIONES_EGRESO[caja.nombre] ?? DESCRIPCIONES_EGRESO_GENERICAS),
      fecha,
      cajaId: caja.id,
    };
  });
}

/** Ingresos típicos en COP, en centavos: entre 300.000 y 3.500.000. */
function montoIngreso(random: () => number): number {
  const pesos = 300_000 + Math.floor(random() * 3_200_000);
  // redondea a miles de pesos para que se lea natural
  return Math.round(pesos / 1000) * 1000 * 100;
}

function elegir<T>(random: () => number, opciones: readonly T[]): T {
  return opciones[Math.floor(random() * opciones.length)];
}

const DESCRIPCIONES_INGRESO = [
  'Salario quincena',
  'Pago freelance',
  'Venta de segunda mano',
  'Reembolso',
  'Bono por proyecto',
  'Ingreso extra',
] as const;

const DESCRIPCIONES_EGRESO_GENERICAS = [
  'Compra',
  'Pago varios',
  'Retiro',
] as const;

const DESCRIPCIONES_EGRESO: Record<string, readonly string[]> = {
  Gastos: ['Mercado', 'Arriendo', 'Servicios públicos', 'Transporte', 'Restaurante', 'Internet', 'Farmacia'],
  Inversión: ['Aporte fondo indexado', 'Compra de acciones', 'CDT', 'Aporte cripto'],
  Ahorro: ['Traslado a ahorro', 'Fondo de emergencia', 'Meta viaje', 'Ahorro programado'],
};
