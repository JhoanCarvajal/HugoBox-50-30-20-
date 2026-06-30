import { Caja, Reparto } from '../types/models';

type CajaReparto = Pick<Caja, 'id' | 'porcentaje'>;

/** Reparte un ingreso (en centavos enteros) entre cajas según su porcentaje.
 *  Garantiza Σ(partes) === montoCentavos exacto; el residuo va a la caja de mayor %. */
export function repartirIngreso(montoCentavos: number, cajas: CajaReparto[]): Reparto[] {
  if (!Number.isInteger(montoCentavos) || montoCentavos <= 0) {
    throw new Error('El monto (en centavos) debe ser un entero positivo');
  }
  const total = cajas.reduce((s, c) => s + c.porcentaje, 0);
  if (Math.round(total) !== 100) {
    throw new Error('Los porcentajes de las cajas deben sumar 100');
  }

  const partes: Reparto[] = cajas.map((c) => ({
    cajaId: c.id,
    monto: Math.floor((montoCentavos * c.porcentaje) / 100),
  }));

  const asignado = partes.reduce((s, p) => s + p.monto, 0);
  const residuo = montoCentavos - asignado; // entero >= 0
  if (residuo !== 0) {
    let idxMayor = 0;
    for (let i = 1; i < cajas.length; i++) {
      if (cajas[i].porcentaje > cajas[idxMayor].porcentaje) idxMayor = i;
    }
    partes[idxMayor].monto += residuo;
  }
  return partes;
}
