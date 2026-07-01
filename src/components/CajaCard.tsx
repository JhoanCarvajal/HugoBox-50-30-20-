import { View, Text, StyleSheet } from 'react-native';
import { Caja } from '../types/models';
import { formatearMoneda } from '../utils/dinero';
import { Badge } from './ui/Badge';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../theme';

export function CajaCard({ caja }: { caja: Caja }) {
  const negativo = caja.saldo < 0;
  return (
    <View style={s.card}>
      <View style={s.top}>
        <Text style={s.nombre}>{caja.nombre}</Text>
        <Badge label={`${caja.porcentaje}%`} />
      </View>
      <Text style={[s.saldo, negativo && s.neg]}>{formatearMoneda(caja.saldo)}</Text>
      <Text style={s.label}>{negativo ? 'Saldo en negativo' : 'Saldo disponible'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nombre: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text.primary },
  saldo: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary },
  neg: { color: colors.error },
  label: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs },
});
