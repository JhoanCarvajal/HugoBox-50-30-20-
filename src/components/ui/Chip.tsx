import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

/**
 * Chip de filtro (historial). Inactivo: contorno gris sobre superficie.
 * Activo: fondo primaryLight con borde y texto primary.
 */
export function Chip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[s.chip, active && s.chipActive]}
    >
      <Text style={[s.txt, active && s.txtActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  txt: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text.secondary },
  txtActive: { color: colors.primary },
});
