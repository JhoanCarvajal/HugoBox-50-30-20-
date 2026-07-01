import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Caja } from '../types/models';
import { formatearMoneda } from '../utils/dinero';
import { colorCaja, inicial } from '../utils/colorCaja';
import { Avatar } from './ui/Avatar';
import { ProgressBar } from './ui/ProgressBar';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../theme';

interface Props {
  caja: Caja;
  /** Índice de orden para derivar el color de la caja. */
  index?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tarjeta de caja del dashboard "Sereno": avatar de color + nombre y
 * "% de tus ingresos", saldo a la derecha (rojo si negativo) y barra de
 * progreso del color de la caja según su porcentaje.
 */
export function CajaCard({ caja, index = 0, onPress, style }: Props) {
  const par = colorCaja(index);
  const negativo = caja.saldo < 0;

  const Contenedor: any = onPress ? Pressable : View;

  return (
    <Contenedor style={[styles.card, style]} onPress={onPress}>
      <View style={styles.fila}>
        <Avatar
          label={inicial(caja.nombre)}
          color={par.color}
          tint={par.tint}
          size={40}
          shape="rounded"
        />
        <View style={styles.info}>
          <Text style={styles.nombre} numberOfLines={1}>
            {caja.nombre}
          </Text>
          <Text style={styles.sub}>{caja.porcentaje}% de tus ingresos</Text>
        </View>
        <Text style={[styles.saldo, negativo && styles.saldoNeg]}>
          {formatearMoneda(caja.saldo)}
        </Text>
      </View>
      <ProgressBar
        value={caja.porcentaje / 100}
        color={par.color}
        style={styles.barra}
      />
    </Contenedor>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: { flex: 1 },
  nombre: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  sub: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  saldo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  saldoNeg: {
    color: colors.error,
  },
  barra: {
    marginTop: spacing.md,
  },
});
