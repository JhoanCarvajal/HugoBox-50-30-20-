import { View, Text, StyleSheet } from 'react-native';
import { Caja } from '../types/models';
import { formatearMoneda } from '../utils/dinero';

export function CajaCard({ caja }: { caja: Caja }) {
  const negativo = caja.saldo < 0;
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.nombre}>{caja.nombre}</Text>
        <Text style={s.pct}>{caja.porcentaje}%</Text>
      </View>
      <Text style={[s.saldo, negativo && s.neg]}>{formatearMoneda(caja.saldo)}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  nombre: { fontSize: 16, fontWeight: '600' },
  pct: { color: '#888' },
  saldo: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  neg: { color: '#d32f2f' },
});
