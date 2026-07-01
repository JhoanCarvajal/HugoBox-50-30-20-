import { useState } from 'react';
import { View, FlatList, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useSessionStore } from '../../src/stores/sessionStore';
import { borrarTransaccion } from '../../src/features/transacciones/transaccionesService';
import { formatearMoneda } from '../../src/utils/dinero';
import { formatearFecha } from '../../src/utils/fecha';

export default function Historial() {
  const [filtro, setFiltro] = useState<string | null>(null);
  const { items } = useHistorial(filtro);
  const { cajas } = useCajas();
  const uid = useSessionStore((s) => s.usuario?.uid);

  const onBorrar = (id: string) =>
    Alert.alert('Borrar', '¿Eliminar este movimiento? Se revertirán los saldos.', [
      { text: 'Cancelar' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          if (!uid) return;
          try {
            await borrarTransaccion(uid, id);
          } catch (err) {
            // Si el borrado falla (red/Firestore caído), se informa al
            // usuario en vez de dejarlo creyendo que el movimiento se
            // eliminó y los saldos se revirtieron.
            Alert.alert('No se pudo borrar', err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);

  return (
    <View style={s.c}>
      <View style={s.filtros}>
        <Pressable onPress={() => setFiltro(null)} style={[s.chip, !filtro && s.chipOn]}><Text>Todas</Text></Pressable>
        {cajas.map((c) => (
          <Pressable key={c.id} onPress={() => setFiltro(c.id)} style={[s.chip, filtro === c.id && s.chipOn]}>
            <Text>{c.nombre}</Text></Pressable>
        ))}
      </View>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => onBorrar(item.id)} style={s.row}>
            <View style={s.info}>
              <Text style={s.desc}>{item.descripcion || item.tipo}</Text>
              <Text style={s.fecha}>{formatearFecha(item.fecha)}</Text>
            </View>
            <Text style={item.tipo === 'ingreso' ? s.in : s.out}>
              {item.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(item.monto)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Text style={s.vacioTxt}>Aún no tienes movimientos</Text>
          </View>
        }
      />
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, padding: 12 },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#eee' },
  chipOn: { backgroundColor: '#cfe0fc' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  info: { flexShrink: 1 },
  desc: { fontSize: 15 },
  fecha: { fontSize: 12, color: '#999', marginTop: 2 },
  in: { color: '#2e7d32', fontWeight: '600' },
  out: { color: '#d32f2f', fontWeight: '600' },
  vacio: { paddingTop: 48, alignItems: 'center' },
  vacioTxt: { color: '#888', fontSize: 15 },
});
