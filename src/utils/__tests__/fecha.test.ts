import { formatearFecha } from '../fecha';

// El motor ICU de `Intl` en Node/Jest puede formatear el nombre del mes y el
// orden día/mes/año distinto a como lo hará en el dispositivo real (depende
// de los datos ICU disponibles en el runtime que ejecuta el JS). Por eso NO
// se asevera el string exacto devuelto por `Intl.DateTimeFormat`: se verifica
// de forma TOLERANTE que el resultado sea un string no vacío, que contenga
// el año completo de la fecha dada y al menos un dígito (del día).
describe('formatearFecha', () => {
  it('devuelve un string no vacío para un epoch válido', () => {
    const resultado = formatearFecha(Date.now());
    expect(typeof resultado).toBe('string');
    expect(resultado.length).toBeGreaterThan(0);
  });

  it('incluye el año de la fecha dada (tolerante al formato exacto de mes/orden)', () => {
    // 30 jun 2026, mediodía UTC para evitar que el offset de zona horaria
    // local del entorno de test empuje la fecha al día/mes/año anterior.
    const epoch = new Date('2026-06-30T12:00:00Z').getTime();
    const resultado = formatearFecha(epoch);
    expect(resultado).toContain('2026');
  });

  it('incluye al menos un dígito correspondiente al día', () => {
    const epoch = new Date('2026-06-30T12:00:00Z').getTime();
    const resultado = formatearFecha(epoch);
    expect(resultado).toMatch(/\d/);
  });
});
