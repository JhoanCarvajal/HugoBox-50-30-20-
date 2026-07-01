import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

/**
 * Etiqueta compacta tipo pill. Uso principal: porcentaje de reparto en CajaCard.
 * Fondo primaryLight con texto primary, según el design system.
 */
export function Badge({ label }: { label: string }) {
  return (
    <View style={s.badge}>
      <Text style={s.txt}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  txt: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
