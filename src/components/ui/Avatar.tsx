import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, fontWeight } from '../../theme';

interface Props {
  /** Texto a mostrar (inicial). */
  label: string;
  /** Color base. Por defecto primary. */
  color?: string;
  /** Tinte de fondo cuando `filled` es false. Por defecto primaryLight. */
  tint?: string;
  /** Diámetro/lado en px. Por defecto 40. */
  size?: number;
  /** 'rounded' (cuadrado redondeado, cajas) | 'circle' (perfil/usuario). */
  shape?: 'rounded' | 'circle';
  /** true → fondo pleno con texto blanco; false → fondo tinte con texto de color. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Avatar con inicial. Dos variantes del mockup "Sereno":
 * - Caja: `shape="rounded"`, tinte de fondo + inicial en color.
 * - Usuario: `shape="circle" filled`, fondo pleno + inicial blanca.
 */
export function Avatar({
  label,
  color = colors.primary,
  tint = colors.primaryLight,
  size = 40,
  shape = 'rounded',
  filled = false,
  style,
}: Props) {
  const borderRadius = shape === 'circle' ? size / 2 : size * 0.3;
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius, backgroundColor: filled ? color : tint },
        style,
      ]}
    >
      <Text style={[styles.txt, { color: filled ? colors.white : color, fontSize: size * 0.42 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  txt: {
    fontWeight: fontWeight.bold,
  },
});
