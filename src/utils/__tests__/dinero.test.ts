import {
  aCentavos, aUnidades, formatearMoneda, parsearMonto,
} from '../dinero';

describe('aCentavos', () => {
  it('convierte unidades a centavos enteros', () => {
    expect(aCentavos(100.01)).toBe(10001);
    expect(aCentavos(33.33)).toBe(3333);
    expect(aCentavos(0.1)).toBe(10);
  });
});

describe('aUnidades', () => {
  it('convierte centavos a unidades', () => {
    expect(aUnidades(10001)).toBe(100.01);
  });
});

describe('formatearMoneda', () => {
  it('formatea centavos con símbolo y 2 decimales', () => {
    expect(formatearMoneda(123450)).toContain('1.234,5');
  });
});

describe('parsearMonto', () => {
  it('entero simple sin separadores', () => {
    expect(parsearMonto('100')).toBe(100);
  });

  it('decimal con punto', () => {
    expect(parsearMonto('100.5')).toBe(100.5);
  });

  it('decimal con coma (es-CO)', () => {
    expect(parsearMonto('100,50')).toBe(100.5);
  });

  it('miles con punto sin decimales', () => {
    expect(parsearMonto('1.000')).toBe(1000);
  });

  it('miles con coma sin decimales', () => {
    expect(parsearMonto('1,000')).toBe(1000);
  });

  it('miles con punto y decimal con coma', () => {
    expect(parsearMonto('1.234,56')).toBe(1234.56);
  });

  it('miles con coma y decimal con punto', () => {
    expect(parsearMonto('1,234.56')).toBe(1234.56);
  });

  it('decimal corto con ceros a la izquierda', () => {
    expect(parsearMonto('0.01')).toBe(0.01);
  });

  it('texto inválido da NaN', () => {
    expect(Number.isNaN(parsearMonto('abc'))).toBe(true);
  });
});
