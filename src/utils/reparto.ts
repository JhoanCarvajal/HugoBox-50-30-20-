import { Caja, Reparto } from '../types/models';
import { redondear2 } from './dinero';

type CajaReparto = Pick<Caja, 'id' | 'porcentaje'>;

export function repartirIngreso(monto: number, cajas: CajaReparto[]): Reparto[] {
  if (!(monto > 0)) throw new Error('El monto debe ser positivo');
  const total = cajas.reduce((s, c) => s + c.porcentaje, 0);
  if (Math.round(total) !== 100) {
    throw new Error('Los porcentajes de las cajas deben sumar 100');
  }

  const partes: Reparto[] = cajas.map((c) => ({
    cajaId: c.id,
    monto: redondear2((monto * c.porcentaje) / 100),
  }));

  const sumaPartes = redondear2(partes.reduce((s, p) => s + p.monto, 0));
  const residuo = redondear2(monto - sumaPartes);
  if (residuo !== 0) {
    // caja de mayor porcentaje recibe el residuo
    let idxMayor = 0;
    for (let i = 1; i < cajas.length; i++) {
      if (cajas[i].porcentaje > cajas[idxMayor].porcentaje) idxMayor = i;
    }
    partes[idxMayor].monto = redondear2(partes[idxMayor].monto + residuo);
  }
  return partes;
}
