import {
  View, FlatList, Pressable, Text, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
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
    <View style={s.c}>
      <View style={s.header}>
        <Text style={s.saludo} numberOfLines={1}>{nombreMostrado}</Text>
        <Pressable onPress={onCerrarSesion} style={s.logout}>
          <Text style={s.logoutTxt}>Cerrar sesión</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => router.push('/cajas')} style={s.gestion}>
        <Text style={s.gestionTxt}>Gestionar cajas</Text>
      </Pressable>
      {cargando ? (
        <View style={s.centro} testID="dashboard-cargando">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={cajas}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CajaCard caja={item} />}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={
            <View style={s.centro}>
              <Text style={s.vacioTxt}>Aún no tienes cajas</Text>
            </View>
          }
        />
      )}
      <Pressable style={s.fab} onPress={() => router.push('/transaccion/nueva')}>
        <Text style={s.fabTxt}>＋ Movimiento</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
  },
  saludo: { flexShrink: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text.primary },
  logout: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  logoutTxt: { color: colors.error, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  gestion: { padding: spacing.lg },
  gestionTxt: { color: colors.primary, fontWeight: fontWeight.semibold },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacioTxt: { color: colors.text.tertiary, fontSize: fontSize.md },
  fab: { position: 'absolute', bottom: spacing.xxl, right: spacing.xxl, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  fabTxt: { color: colors.white, fontWeight: fontWeight.bold },
});
