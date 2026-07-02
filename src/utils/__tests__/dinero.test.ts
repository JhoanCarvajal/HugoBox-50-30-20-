import {
  aCentavos, aUnidades, formatearMoneda, parsearMonto,
  sanitizarMonto, formatearEntrada, calcularCambioMonto,
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

describe('sanitizarMonto', () => {
  it('cadena vacía o sin dígitos → vacío', () => {
    expect(sanitizarMonto('')).toBe('');
    expect(sanitizarMonto('abc')).toBe('');
  });

  it('entero simple sin separadores', () => {
    expect(sanitizarMonto('1500')).toBe('1500');
  });

  it('conserva el decimal con punto tal cual se teclea', () => {
    expect(sanitizarMonto('1500.5')).toBe('1500.5');
    expect(sanitizarMonto('1500.50')).toBe('1500.50');
  });

  it('conserva el punto decimal en progreso (sin dígitos aún)', () => {
    expect(sanitizarMonto('1500.')).toBe('1500.');
  });

  it('normaliza el formato US pegado (coma miles, punto decimal)', () => {
    expect(sanitizarMonto('1,500.00')).toBe('1500.00');
  });

  it('normaliza el formato EU pegado (punto miles, coma decimal)', () => {
    expect(sanitizarMonto('1.500,00')).toBe('1500.00');
  });

  it('descarta el símbolo de moneda y espacios al pegar', () => {
    expect(sanitizarMonto('$ 1,500.00')).toBe('1500.00');
  });

  it('coma sola son miles (se descartan)', () => {
    expect(sanitizarMonto('1,500')).toBe('1500');
    expect(sanitizarMonto('1,500,000')).toBe('1500000');
  });

  it('recorta a un máximo de 2 decimales', () => {
    expect(sanitizarMonto('1500.567')).toBe('1500.56');
    expect(sanitizarMonto('1,500.567')).toBe('1500.56');
  });

  it('quita ceros a la izquierda pero conserva un cero', () => {
    expect(sanitizarMonto('007')).toBe('7');
    expect(sanitizarMonto('0')).toBe('0');
    expect(sanitizarMonto('0.50')).toBe('0.50');
  });

  it('antepone cero cuando falta la parte entera', () => {
    expect(sanitizarMonto('.5')).toBe('0.5');
  });

  it('descarta el signo negativo', () => {
    expect(sanitizarMonto('-1500')).toBe('1500');
  });
});

describe('formatearEntrada', () => {
  it('vacío → vacío', () => {
    expect(formatearEntrada('')).toBe('');
  });

  it('agrupa miles con coma', () => {
    expect(formatearEntrada('1500')).toBe('1,500');
    expect(formatearEntrada('1234567')).toBe('1,234,567');
  });

  it('respeta los decimales tecleados sin padear', () => {
    expect(formatearEntrada('1500.5')).toBe('1,500.5');
    expect(formatearEntrada('1500.50')).toBe('1,500.50');
  });

  it('respeta el punto decimal en progreso', () => {
    expect(formatearEntrada('1500.')).toBe('1,500.');
  });

  it('con blur fuerza 2 decimales', () => {
    expect(formatearEntrada('1500', { blur: true })).toBe('1,500.00');
    expect(formatearEntrada('1500.5', { blur: true })).toBe('1,500.50');
    expect(formatearEntrada('1500.', { blur: true })).toBe('1,500.00');
  });

  it('maneja el cero y decimales pequeños', () => {
    expect(formatearEntrada('0')).toBe('0');
    expect(formatearEntrada('0.5')).toBe('0.5');
    expect(formatearEntrada('0.5', { blur: true })).toBe('0.50');
  });
});

describe('calcularCambioMonto (reubicación de cursor)', () => {
  // Firma: calcularCambioMonto(displayPrevio, textoEntrante). Localiza la edición por
  // diff entre el texto mostrado antes y el que llega, sin depender del selection nativo.

  it('mantiene el cursor al final al teclear sin separadores', () => {
    // "12" → se teclea "3" al final → "123"
    expect(calcularCambioMonto('12', '123')).toEqual({ canonico: '123', display: '123', cursor: 3 });
  });

  it('deja el cursor al final cuando el 4º dígito activa el separador de miles', () => {
    // BUG reportado: "123" → se teclea "4" → "1234"; debe quedar tras el "4" en "1,234"
    expect(calcularCambioMonto('123', '1234')).toEqual({ canonico: '1234', display: '1,234', cursor: 5 });
  });

  it('mantiene el cursor al final al seguir tecleando miles', () => {
    // "1,234" → se teclea "5" al final → texto entrante "1,2345"
    expect(calcularCambioMonto('1,234', '1,2345')).toEqual({ canonico: '12345', display: '12,345', cursor: 6 });
  });

  it('conserva el cursor tras el dígito insertado en medio', () => {
    // "1,000" con el cursor tras el "1"; se teclea "5" → texto entrante "15,000"
    expect(calcularCambioMonto('1,000', '15,000')).toEqual({ canonico: '15000', display: '15,000', cursor: 2 });
  });

  it('recoloca el cursor al final al borrar un dígito que reagrupa', () => {
    // "12,345" → backspace del último dígito → "12,34" → se reformatea a "1,234"
    expect(calcularCambioMonto('12,345', '12,34')).toEqual({ canonico: '1234', display: '1,234', cursor: 5 });
  });

  it('cuenta el punto decimal como carácter significativo', () => {
    // "1,500" → se teclea "." → "1,500."
    expect(calcularCambioMonto('1,500', '1,500.')).toEqual({ canonico: '1500.', display: '1,500.', cursor: 6 });
  });

  it('texto vacío deja el cursor en 0', () => {
    // "1" → backspace → ""
    expect(calcularCambioMonto('1', '')).toEqual({ canonico: '', display: '', cursor: 0 });
  });
});
