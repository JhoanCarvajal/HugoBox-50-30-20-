export type TipoMovimiento = 'ingreso' | 'egreso';

export interface Caja {
  id: string;
  nombre: string;
  porcentaje: number;   // 0..100; suma 100 entre cajas activas
  saldo: number;        // acumulado
  esPorDefecto: boolean;
  orden: number;
  createdAt: number;    // epoch ms
}

export type NuevaCaja = Pick<Caja, 'nombre' | 'porcentaje'>;

export interface Reparto {
  cajaId: string;
  monto: number;
}

export interface Transaccion {
  id: string;
  tipo: TipoMovimiento;
  monto: number;            // positivo
  fecha: number;            // epoch ms
  descripcion: string;
  cajaId: string | null;    // egreso → caja origen
  reparto: Reparto[];       // ingreso → cómo se dividió
  createdAt: number;
}

export interface Usuario {
  uid: string;
  email: string | null;
  displayName: string | null;
  monedaPreferida: string;  // "COP"
  createdAt: number;
}
