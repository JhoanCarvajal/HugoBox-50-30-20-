import { View, Text, StyleSheet } from 'react-native';
import { Caja } from '../types/models';
import { formatearMoneda } from '../utils/dinero';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../theme';

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
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  nombre: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  pct: { color: colors.text.tertiary },
  saldo: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: spacing.sm },
  neg: { color: colors.error },
});
