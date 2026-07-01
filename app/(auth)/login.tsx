import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { entrarConGoogle } from '../../src/features/auth/authService';
import { Avatar } from '../../src/components/ui/Avatar';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';

export default function Login() {
  const [cargando, setCargando] = useState(false);

  const onPress = async () => {
    setCargando(true);
    try {
      await entrarConGoogle();
    } catch {
      Alert.alert('No pudimos iniciar sesión', 'Inténtalo de nuevo en un momento.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={s.c}>
      <Avatar label="H" filled shape="rounded" size={72} style={s.logo} />
      <Text style={s.titulo}>HugoBox</Text>
      <Text style={s.sub}>Organiza tu dinero en cajas</Text>

      <Pressable
        style={s.google}
        onPress={onPress}
        disabled={cargando}
        accessibilityRole="button"
        accessibilityLabel="Continuar con Google"
      >
        {cargando ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={s.googleTxt}>Continuar con Google</Text>
          </>
        )}
      </Pressable>

      <Text style={s.disclaimer}>
        Al continuar aceptas los Términos y la Política de privacidad.
      </Text>
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
  logo: { marginBottom: spacing.xl },
  titulo: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sub: {
    fontSize: fontSize.md,
    color: colors.text.tertiary,
    marginBottom: spacing.xxxl,
  },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    minHeight: 56,
  },
  googleTxt: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.text.quaternary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
