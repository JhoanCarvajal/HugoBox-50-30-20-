import { txFormSchema } from '../txSchema';

it('exige caja en egreso', () => {
  expect(() => txFormSchema.parse({ tipo: 'egreso', monto: 10, descripcion: '', cajaId: null })).toThrow();
});
it('ingreso no exige caja', () => {
  expect(() => txFormSchema.parse({ tipo: 'ingreso', monto: 10, descripcion: '', cajaId: null })).not.toThrow();
});
