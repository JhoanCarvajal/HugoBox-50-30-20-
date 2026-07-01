import {
  View, FlatList, Pressable, Text, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCajas } from '../../src/features/cajas/useCajas';
import { CajaCard } from '../../src/components/CajaCard';
import { useSessionStore } from '../../src/stores/sessionStore';
import { cerrarSesion } from '../../src/features/auth/authService';

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
          <ActivityIndicator size="large" color="#1a73e8" />
        </View>
      ) : (
        <FlatList
          data={cajas}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CajaCard caja={item} />}
          contentContainerStyle={{ padding: 16 }}
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
  c: { flex: 1, backgroundColor: '#f4f5f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16,
  },
  saludo: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  logout: { paddingVertical: 6, paddingHorizontal: 10 },
  logoutTxt: { color: '#d32f2f', fontWeight: '600', fontSize: 13 },
  gestion: { padding: 16 },
  gestionTxt: { color: '#1a73e8', fontWeight: '600' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacioTxt: { color: '#888', fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#1a73e8', borderRadius: 28, paddingVertical: 14, paddingHorizontal: 20 },
  fabTxt: { color: 'white', fontWeight: '700' },
});
