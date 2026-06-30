import { redondear2, formatearMoneda } from '../dinero';

describe('redondear2', () => {
  it('redondea a 2 decimales', () => {
    expect(redondear2(10.005)).toBe(10.01);
    expect(redondear2(33.333)).toBe(33.33);
  });
});

describe('formatearMoneda', () => {
  it('formatea con símbolo y 2 decimales', () => {
    expect(formatearMoneda(1234.5)).toContain('1.234,5');
  });
});
