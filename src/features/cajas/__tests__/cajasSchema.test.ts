import { nuevaCajaSchema, validarSumaPorcentajes } from '../cajasSchema';

describe('nuevaCajaSchema', () => {
  it('debe validar un nombre válido', () => {
    const result = nuevaCajaSchema.safeParse({ nombre: 'Comisiones', porcentaje: 50 });
    expect(result.success).toBe(true);
  });

  it('debe rechazar un nombre vacío', () => {
    const result = nuevaCajaSchema.safeParse({ nombre: '', porcentaje: 50 });
    expect(result.success).toBe(false);
  });

  it('debe trim el nombre', () => {
    const result = nuevaCajaSchema.safeParse({ nombre: '  Comisiones  ', porcentaje: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nombre).toBe('Comisiones');
    }
  });

  it('debe rechazar un nombre > 40 caracteres', () => {
    const result = nuevaCajaSchema.safeParse({ nombre: 'a'.repeat(41), porcentaje: 50 });
    expect(result.success).toBe(false);
  });

  it('debe validar un porcentaje en rango [0, 100]', () => {
    const result = nuevaCajaSchema.safeParse({ nombre: 'Test', porcentaje: 0 });
    expect(result.success).toBe(true);
  });

  it('debe rechazar un porcentaje < 0', () => {
    const result = nuevaCajaSchema.safeParse({ nombre: 'Test', porcentaje: -1 });
    expect(result.success).toBe(false);
  });

  it('debe rechazar un porcentaje > 100', () => {
    const result = nuevaCajaSchema.safeParse({ nombre: 'Test', porcentaje: 101 });
    expect(result.success).toBe(false);
  });
});

describe('validarSumaPorcentajes', () => {
  it('debe aceptar suma exacta de 100', () => {
    expect(() => validarSumaPorcentajes([50, 50])).not.toThrow();
  });

  it('debe aceptar suma que redondea a 100', () => {
    expect(() => validarSumaPorcentajes([33.33, 33.33, 33.34])).not.toThrow();
  });

  it('debe rechazar suma no igual a 100', () => {
    expect(() => validarSumaPorcentajes([50, 49])).toThrow();
  });

  it('debe rechazar array vacío', () => {
    expect(() => validarSumaPorcentajes([])).toThrow();
  });
});
