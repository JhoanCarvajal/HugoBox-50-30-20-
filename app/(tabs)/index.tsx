import { View, FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCajas } from '../../src/features/cajas/useCajas';
import { CajaCard } from '../../src/components/CajaCard';

export default function Cajas() {
  const { cajas } = useCajas();
  const router = useRouter();
  return (
    <View style={s.c}>
      <FlatList
        data={cajas}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CajaCard caja={item} />}
        contentContainerStyle={{ padding: 16 }}
      />
      <Pressable style={s.fab} onPress={() => router.push('/transaccion/nueva')}>
        <Text style={s.fabTxt}>＋ Movimiento</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#f4f5f7' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#1a73e8', borderRadius: 28, paddingVertical: 14, paddingHorizontal: 20 },
  fabTxt: { color: 'white', fontWeight: '700' },
});
