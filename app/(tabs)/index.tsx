import {
  View, FlatList, Pressable, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCajas } from '../../src/features/cajas/useCajas';
import { CajaCard } from '../../src/components/CajaCard';

export default function Cajas() {
  const { cajas, cargando } = useCajas();
  const router = useRouter();
  return (
    <View style={s.c}>
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
  gestion: { padding: 16 },
  gestionTxt: { color: '#1a73e8', fontWeight: '600' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacioTxt: { color: '#888', fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#1a73e8', borderRadius: 28, paddingVertical: 14, paddingHorizontal: 20 },
  fabTxt: { color: 'white', fontWeight: '700' },
});
