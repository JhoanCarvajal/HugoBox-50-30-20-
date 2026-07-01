import { z } from 'zod';

export const txFormSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  monto: z.number().positive('El monto debe ser mayor a 0'),
  descripcion: z.string().trim().max(80).default(''),
  cajaId: z.string().nullable(),
}).refine((d) => d.tipo === 'ingreso' || !!d.cajaId, {
  message: 'Elige una caja para el egreso', path: ['cajaId'],
});

export type TxForm = z.infer<typeof txFormSchema>;
