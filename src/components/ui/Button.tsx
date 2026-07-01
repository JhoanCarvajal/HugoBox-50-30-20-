import { ReactNode } from 'react';
import {
  Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, StyleProp,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

type Variant = 'primary' | 'success' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** Color de acción. primary = azul, success = verde (ingreso), destructive = rojo (egreso). */
  variant?: Variant;
  /** Botón de bloque: ancho completo y radio pequeño (login/formularios). Por defecto es pill. */
  block?: boolean;
  /** Muestra un spinner y deshabilita la pulsación. */
  loading?: boolean;
  disabled?: boolean;
  /** Icono opcional a la izquierda del label (p. ej. la "G" de Google). */
  leftIcon?: ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const BG: Record<Variant, string> = {
  primary: colors.primary,
  success: colors.success,
  destructive: colors.error,
};

/**
 * Botón de acción del design system HugoBox.
 * Pill por defecto (radius.pill); `block` para el CTA full-width de login/forms.
 */
export function Button({
  label, onPress, variant = 'primary', block = false,
  loading = false, disabled = false, leftIcon, testID, style,
}: ButtonProps) {
  const inactivo = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: loading }}
      style={({ pressed }) => [
        s.base,
        block ? s.block : s.pill,
        { backgroundColor: BG[variant] },
        inactivo && s.inactivo,
        pressed && !inactivo && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          {leftIcon}
          <Text style={s.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pill: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  block: {
    width: '100%',
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
  },
  label: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  inactivo: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
});
