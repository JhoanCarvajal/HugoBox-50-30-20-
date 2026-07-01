import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Mensaje de error; tiñe el borde y se muestra debajo. */
  error?: string;
  /** Variante de monto: texto grande, negrita y centrado. */
  large?: boolean;
}

/**
 * Campo de texto del design system: label opcional, estado de error y una
 * variante `large` para el monto. Reenvía el resto de props a TextInput,
 * por lo que es compatible con react-hook-form (value/onChangeText/onBlur).
 */
export function TextField({ label, error, large = false, style, ...rest }: TextFieldProps) {
  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.text.quaternary}
        style={[s.input, large && s.inputLarge, !!error && s.inputError, style]}
        {...rest}
      />
      {error ? <Text style={s.errorTxt}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text.secondary },
  input: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  inputLarge: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, textAlign: 'center' },
  inputError: { borderColor: colors.error },
  errorTxt: { fontSize: fontSize.xs, color: colors.error },
});
