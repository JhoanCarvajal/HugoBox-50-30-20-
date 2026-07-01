import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { entrarConGoogle } from '../../src/features/auth/authService';
import { Button } from '../../src/components/ui/Button';
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
      <View style={s.logo}>
        <Text style={s.logoTxt}>H</Text>
      </View>
      <Text style={s.titulo}>HugoBox</Text>
      <Text style={s.sub}>Organiza tu dinero en cajas</Text>
      <Button
        label="Iniciar sesión con Google"
        onPress={onPress}
        loading={cargando}
        block
        leftIcon={(
          <View style={s.g}>
            <Text style={s.gTxt}>G</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.background,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  logoTxt: { color: colors.white, fontSize: 44, fontWeight: fontWeight.bold },
  titulo: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm },
  sub: { fontSize: fontSize.md, color: colors.text.tertiary, marginBottom: spacing.xxxl },
  g: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gTxt: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
