import { useMemo, useState } from 'react';
import { View, FlatList, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useCajas } from '../../src/features/cajas/useCajas';
import { filtrarHistorial, rangoFecha, ClaveRangoFecha } from '../../src/features/transacciones/filtros';
import { useSessionStore } from '../../src/stores/sessionStore';
import { borrarTransaccion } from '../../src/features/transacciones/transaccionesService';
import { formatearMoneda } from '../../src/utils/dinero';
import { formatearFecha } from '../../src/utils/fecha';

const OPCIONES_FECHA: { clave: ClaveRangoFecha; etiqueta: string }[] = [
  { clave: 'todo', etiqueta: 'Todo' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'mesPasado', etiqueta: 'Mes pasado' },
  { clave: 'anio', etiqueta: 'Este año' },
];

export default function Historial() {
  const [filtroCaja, setFiltroCaja] = useState<string | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<ClaveRangoFecha>('todo');
  const { items } = useHistorial();
  const { cajas } = useCajas();
  const uid = useSessionStore((s) => s.usuario?.uid);

  const itemsFiltrados = useMemo(() => {
    const { desde, hasta } = rangoFecha(filtroFecha, Date.now());
    return filtrarHistorial(items, { cajaId: filtroCaja, desde, hasta });
  }, [items, filtroCaja, filtroFecha]);

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
        <Pressable onPress={() => setFiltroCaja(null)} style={[s.chip, !filtroCaja && s.chipOn]}>
          <Text>Todas</Text>
        </Pressable>
        {cajas.map((c) => (
          <Pressable key={c.id} onPress={() => setFiltroCaja(c.id)} style={[s.chip, filtroCaja === c.id && s.chipOn]}>
            <Text>{c.nombre}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.filtros}>
        {OPCIONES_FECHA.map((o) => (
          <Pressable
            key={o.clave}
            onPress={() => setFiltroFecha(o.clave)}
            style={[s.chip, filtroFecha === o.clave && s.chipOn]}
          >
            <Text>{o.etiqueta}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={itemsFiltrados}
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
            <Text style={s.vacioTxt}>
              {items.length === 0
                ? 'Aún no tienes movimientos'
                : 'No hay movimientos con estos filtros'}
            </Text>
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
