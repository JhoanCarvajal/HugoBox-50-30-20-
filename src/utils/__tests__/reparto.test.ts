import { repartirIngreso } from '../reparto';

const cajas = [
  { id: 'g', porcentaje: 50 },
  { id: 'i', porcentaje: 20 },
  { id: 'a', porcentaje: 30 },
];

describe('repartirIngreso', () => {
  it('reparte exacto 50/20/30', () => {
    expect(repartirIngreso(100, cajas)).toEqual([
      { cajaId: 'g', monto: 50 },
      { cajaId: 'i', monto: 20 },
      { cajaId: 'a', monto: 30 },
    ]);
  });

  it('la suma de partes siempre iguala el monto (con residuo)', () => {
    const cajasIguales = [
      { id: 'x', porcentaje: 33 },
      { id: 'y', porcentaje: 33 },
      { id: 'z', porcentaje: 34 },
    ];
    const partes = repartirIngreso(100, cajasIguales);
    const suma = partes.reduce((s, p) => s + p.monto, 0);
    expect(suma).toBe(100);
  });

  it('asigna el residuo a la caja de mayor porcentaje', () => {
    const partes = repartirIngreso(10, [
      { id: 'a', porcentaje: 33 },
      { id: 'b', porcentaje: 33 },
      { id: 'c', porcentaje: 34 },
    ]);
    const c = partes.find((p) => p.cajaId === 'c')!;
    // base 3.4 + residuo
    expect(c.monto).toBeGreaterThanOrEqual(3.4);
    expect(partes.reduce((s, p) => s + p.monto, 0)).toBe(10);
  });

  it('lanza si los porcentajes no suman 100', () => {
    expect(() => repartirIngreso(100, [{ id: 'a', porcentaje: 90 }])).toThrow();
  });

  it('lanza si el monto no es positivo', () => {
    expect(() => repartirIngreso(0, cajas)).toThrow();
  });
});
