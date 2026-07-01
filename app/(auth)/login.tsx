import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { entrarConGoogle } from '../../src/features/auth/authService';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';

export default function Login() {
  const [cargando, setCargando] = useState(false);
  const onPress = async () => {
    try { setCargando(true); await entrarConGoogle(); }
    catch (e) { Alert.alert('No se pudo iniciar sesión', String(e)); }
    finally { setCargando(false); }
  };
  return (
    <View style={s.c}>
      <Text style={s.titulo}>HugoBox</Text>
      <Text style={s.sub}>Tu presupuesto por cajas</Text>
      <Pressable style={s.btn} onPress={onPress} disabled={cargando}>
        <Text style={s.btnTxt}>{cargando ? 'Entrando…' : 'Continuar con Google'}</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl },
  titulo: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.md, color: colors.text.secondary, marginBottom: spacing.xxl },
  btn: { backgroundColor: colors.primary, paddingVertical: spacing.lg, paddingHorizontal: spacing.xxxl, borderRadius: radius.sm },
  btnTxt: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
});
