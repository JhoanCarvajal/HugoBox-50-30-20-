import { Alert } from 'react-native';
import { useSessionStore } from '../../stores/sessionStore';
import { agregarIngreso, agregarEgreso, editarTransaccion } from './transaccionesService';

export function useTransacciones() {
  const uid = useSessionStore((s) => s.usuario?.uid);
  async function crearIngreso(monto: number, descripcion: string) {
    if (!uid) return;
    await agregarIngreso(uid, { monto, descripcion, fecha: Date.now() });
  }
  async function crearEgreso(monto: number, cajaId: string, descripcion: string) {
    if (!uid) return;
    const { advertenciaSaldo } = await agregarEgreso(uid, { monto, cajaId, descripcion, fecha: Date.now() });
    if (advertenciaSaldo) {
      Alert.alert('Saldo insuficiente', 'Registramos el egreso, pero esta caja quedó en negativo.');
    }
  }
  async function editar(
    txId: string,
    datos: { monto: number; descripcion: string; cajaId?: string },
  ) {
    if (!uid) return;
    const { advertenciaSaldo } = await editarTransaccion(uid, txId, datos);
    if (advertenciaSaldo) {
      Alert.alert('Saldo insuficiente', 'Registramos el egreso, pero esta caja quedó en negativo.');
    }
  }
  return {
    crearIngreso, crearEgreso, editar,
  };
}
