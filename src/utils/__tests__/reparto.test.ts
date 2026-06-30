import { repartirIngreso } from '../reparto';

const cajas = [
  { id: 'g', porcentaje: 50 },
  { id: 'i', porcentaje: 20 },
  { id: 'a', porcentaje: 30 },
];

describe('repartirIngreso (centavos enteros)', () => {
  it('reparte exacto 50/20/30 de 10000 centavos', () => {
    expect(repartirIngreso(10000, cajas)).toEqual([
      { cajaId: 'g', monto: 5000 },
      { cajaId: 'i', monto: 2000 },
      { cajaId: 'a', monto: 3000 },
    ]);
  });

  it('asigna el residuo entero a la caja de MAYOR porcentaje', () => {
    const partes = repartirIngreso(10001, [
      { id: 'a', porcentaje: 33 },
      { id: 'b', porcentaje: 33 },
      { id: 'c', porcentaje: 34 },
    ]);
    expect(partes).toEqual([
      { cajaId: 'a', monto: 3300 },
      { cajaId: 'b', monto: 3300 },
      { cajaId: 'c', monto: 3401 },
    ]);
    expect(partes.reduce((s, p) => s + p.monto, 0)).toBe(10001);
  });

  it('la suma de partes SIEMPRE iguala el monto (barrido)', () => {
    for (let monto = 1; monto <= 5000; monto += 7) {
      const partes = repartirIngreso(monto, [
        { id: 'a', porcentaje: 33 },
        { id: 'b', porcentaje: 33 },
        { id: 'c', porcentaje: 34 },
      ]);
      expect(partes.reduce((s, p) => s + p.monto, 0)).toBe(monto);
    }
  });

  it('lanza si los porcentajes no suman 100', () => {
    expect(() => repartirIngreso(10000, [{ id: 'a', porcentaje: 90 }])).toThrow();
  });

  it('lanza si el monto no es un entero positivo', () => {
    expect(() => repartirIngreso(0, cajas)).toThrow();
    expect(() => repartirIngreso(100.5, cajas)).toThrow();
  });
});
