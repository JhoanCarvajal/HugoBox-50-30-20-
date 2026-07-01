import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../theme';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Color del texto del segmento activo (p. ej. success/error según el tipo). Por defecto primary. */
  activeColor?: string;
}

/**
 * Selector tipo segmented control (ingreso/egreso). Contenedor gris con la
 * pastilla activa en superficie elevada; el texto activo se tiñe con activeColor.
 */
export function SegmentedControl<T extends string>({
  options, value, onChange, activeColor = colors.primary,
}: SegmentedControlProps<T>) {
  return (
    <View style={s.container}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[s.tab, active && s.tabActive]}
          >
            <Text style={[s.txt, active && { color: activeColor }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  tabActive: { backgroundColor: colors.surface, ...shadows.card },
  txt: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text.secondary },
});
