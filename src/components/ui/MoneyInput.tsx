import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { formatearEntrada, calcularCambioMonto } from '../../utils/dinero';

interface MoneyInputProps {
  label?: string;
  /** Valor canónico: dígitos + punto decimal, sin miles (ej: "1500.50"). */
  value: string;
  onChangeValue: (canonico: string) => void;
  /** Mensaje de error; tiñe el borde y se muestra debajo. */
  error?: string;
  /** Prefijo de moneda fijo, no editable. */
  currencySymbol?: string;
  placeholder?: string;
  /** Variante de monto: texto grande y en negrita. */
  large?: boolean;
  testID?: string;
}

type Seleccion = { start: number; end: number };

/**
 * Campo de captura de dinero: formatea miles con coma y decimales con punto en vivo,
 * muestra un prefijo de moneda fijo y aplica formato financiero completo al perder foco.
 * Expone el valor canónico ("1500.50") por `onChangeValue`.
 */
export function MoneyInput({
  label,
  value,
  onChangeValue,
  error,
  currencySymbol = '$',
  placeholder = 'Ingresa un monto',
  large = false,
  testID,
}: MoneyInputProps) {
  const [seleccion, setSeleccion] = useState<Seleccion | undefined>(undefined);

  // Controla la selección solo el render inmediato tras teclear (para reubicar el cursor
  // después de reformatear) y la libera enseguida. Así el usuario puede mover el cursor con
  // un tap sin que el TextInput se lo devuelva a la última posición calculada.
  useEffect(() => {
    if (seleccion !== undefined) setSeleccion(undefined);
  }, [seleccion]);

  // Sin relleno automático de decimales: solo se muestran los decimales que el usuario tecleó.
  const display = value === '' ? '' : formatearEntrada(value);

  function handleChangeText(texto: string) {
    const { canonico, cursor } = calcularCambioMonto(display, texto);
    onChangeValue(canonico);
    setSeleccion({ start: cursor, end: cursor });
  }

  function handleBlur() {
    setSeleccion(undefined);
    if (value.endsWith('.')) onChangeValue(value.slice(0, -1));
  }

  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.row, large && s.rowLarge, !!error && s.rowError]}>
        <Text style={[s.symbol, large && s.symbolLarge]}>{currencySymbol}</Text>
        <TextInput
          testID={testID}
          style={[s.input, large && s.inputLarge]}
          value={display}
          onChangeText={handleChangeText}
          selection={seleccion}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.quaternary}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </View>
      {error ? <Text style={s.errorTxt}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text.secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  rowLarge: { justifyContent: 'center' },
  rowError: { borderColor: colors.error },
  symbol: { fontSize: fontSize.md, color: colors.text.tertiary },
  symbolLarge: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text.tertiary },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text.primary,
    padding: 0,
  },
  inputLarge: {
    flex: 0,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    minWidth: 0,
  },
  errorTxt: { fontSize: fontSize.xs, color: colors.error },
});
