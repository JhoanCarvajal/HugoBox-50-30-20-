import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../../src/stores/sessionStore';
import { cerrarSesion } from '../../src/features/auth/authService';
import { Avatar } from '../../src/components/ui/Avatar';
import { inicial } from '../../src/utils/colorCaja';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/theme';

/** Nombre visible a partir del usuario (displayName → email → "Usuario"). */
function nombreVisible(displayName: string | null, email: string | null): string {
  return displayName?.trim() || email?.split('@')[0] || 'Usuario';
}

interface FilaProps {
  label: string;
  valor?: string;
  onPress?: () => void;
}

function Fila({ label, valor, onPress }: FilaProps) {
  return (
    <Pressable
      style={styles.fila}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.filaLabel}>{label}</Text>
      <View style={styles.filaDer}>
        {valor ? <Text style={styles.filaValor}>{valor}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.text.quaternary} />
      </View>
    </Pressable>
  );
}

export default function Perfil() {
  const usuario = useSessionStore((s) => s.usuario);
  const nombre = nombreVisible(usuario?.displayName ?? null, usuario?.email ?? null);
  const moneda = usuario?.monedaPreferida ?? 'COP';

  const proximamente = () => Alert.alert('Próximamente', 'Esta sección estará disponible pronto.');

  const onCerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => cerrarSesion() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.c}>
        <Text style={styles.titulo}>Perfil</Text>

        <View style={styles.perfilCard}>
          <Avatar label={inicial(nombre)} size={52} shape="circle" filled />
          <View style={styles.perfilInfo}>
            <Text style={styles.perfilNombre}>{nombre}</Text>
            {usuario?.email ? <Text style={styles.perfilEmail}>{usuario.email}</Text> : null}
          </View>
        </View>

        <View style={styles.lista}>
          <Fila label="Cuenta" onPress={proximamente} />
          <View style={styles.sep} />
          <Fila label="Notificaciones" onPress={proximamente} />
          <View style={styles.sep} />
          <Fila label="Moneda" valor={`${moneda} · $`} onPress={proximamente} />
          <View style={styles.sep} />
          <Fila label="Ayuda" onPress={proximamente} />
        </View>

        <Pressable
          style={styles.logout}
          onPress={onCerrarSesion}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Text style={styles.logoutTxt}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  c: { padding: spacing.lg, gap: spacing.lg },
  titulo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  perfilInfo: { flexShrink: 1 },
  perfilNombre: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  perfilEmail: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  lista: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadows.card,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  filaLabel: { fontSize: fontSize.md, color: colors.text.primary },
  filaDer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  filaValor: { fontSize: fontSize.sm, color: colors.text.tertiary, fontWeight: fontWeight.semibold },
  sep: { height: 1, backgroundColor: colors.divider, marginLeft: spacing.lg },
  logout: {
    backgroundColor: '#fdecea',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logoutTxt: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
