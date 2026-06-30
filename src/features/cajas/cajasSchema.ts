import { z } from 'zod';

export const nuevaCajaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre no puede estar vacío').max(40, 'El nombre no puede exceder 40 caracteres'),
  porcentaje: z.number().min(0, 'El porcentaje no puede ser menor a 0').max(100, 'El porcentaje no puede exceder 100'),
});

export function validarSumaPorcentajes(porcentajes: number[]): void {
  if (porcentajes.length === 0) {
    throw new Error('El array de porcentajes no puede estar vacío');
  }
  const suma = porcentajes.reduce((acc, p) => acc + p, 0);
  const sumaRedondeada = Math.round(suma);
  if (sumaRedondeada !== 100) {
    throw new Error(`La suma de los porcentajes debe ser 100, pero es ${suma}`);
  }
}
