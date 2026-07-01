import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius } from '../../theme';

interface Props {
  /** Proporción llena, 0..1. Se recorta a ese rango. */
  value: number;
  /** Color de la parte llena. Por defecto primary. */
  color?: string;
  /** Color del track. Por defecto divider (#eee). */
  trackColor?: string;
  /** Alto de la barra. Por defecto 6. */
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Barra de progreso simple (track + relleno redondeado), según el mockup
 * "Sereno": relleno del color de la caja sobre track gris claro.
 */
export function ProgressBar({ value, color, trackColor, height = 6, style }: Props) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? colors.divider },
        style,
      ]}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? colors.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
