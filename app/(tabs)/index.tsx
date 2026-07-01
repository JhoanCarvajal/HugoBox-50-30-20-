import {
  View, FlatList, Pressable, Text, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCajas } from '../../src/features/cajas/useCajas';
import { CajaCard } from '../../src/components/CajaCard';
import { useSessionStore } from '../../src/stores/sessionStore';
import { cerrarSesion } from '../../src/features/auth/authService';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';

export default function Cajas() {
  const { cajas, cargando } = useCajas();
  const router = useRouter();
  const usuario = useSessionStore((st) => st.usuario);
  const nombreMostrado = usuario?.displayName || usuario?.email || '';

  const onCerrarSesion = () => {
    // Confirmación previa: cerrar sesión desloguea de Google también
    // (ver `cerrarSesion` en authService), así que un toque accidental
    // no debería sacar al usuario sin avisar.
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await cerrarSesion();
            // No se navega manualmente: el guard de `app/_layout.tsx`
            // redirige a `/(auth)/login` en cuanto `usuario` pasa a null.
          } catch (err) {
            Alert.alert('No se pudo cerrar sesión', err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <View style={s.header}>
        <Text style={s.saludo} numberOfLines={1}>Hola, {nombreMostrado}</Text>
        <Pressable style={s.logout} onPress={onCerrarSesion}>
          <Text style={s.logoutTxt}>Salir</Text>
        </Pressable>
      </View>
      <Pressable style={s.gestion} onPress={() => router.push('/cajas')}>
        <Text style={s.gestionTxt}>Gestionar cajas</Text>
      </Pressable>
      {cargando ? (
        <View style={s.centro}>
          <ActivityIndicator testID="dashboard-cargando" size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={cajas}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CajaCard caja={item} />}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={(
            <View style={s.centro}>
              <Text style={s.vacioTxt}>Aún no tienes cajas</Text>
            </View>
          )}
        />
      )}
      <Pressable
        testID="dashboard-fab"
        style={s.fab}
        onPress={() => router.push('/transaccion/nueva')}
        accessibilityRole="button"
        accessibilityLabel="Nuevo movimiento"
      >
        <Text style={s.fabTxt}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
  },
  saludo: { flexShrink: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text.primary },
  logout: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  logoutTxt: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  gestion: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  gestionTxt: { color: colors.primary, fontWeight: fontWeight.semibold },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  vacioTxt: { color: colors.text.tertiary, fontSize: fontSize.md },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  fabTxt: { color: colors.white, fontSize: 30, fontWeight: fontWeight.bold, lineHeight: 34 },
});
