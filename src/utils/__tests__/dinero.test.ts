import { aCentavos, aUnidades, formatearMoneda } from '../dinero';

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
