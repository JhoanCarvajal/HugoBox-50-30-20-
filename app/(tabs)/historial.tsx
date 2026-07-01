import { useMemo, useState } from 'react';
import { View, FlatList, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useCajas } from '../../src/features/cajas/useCajas';
import { filtrarHistorial, rangoFecha, ClaveRangoFecha } from '../../src/features/transacciones/filtros';
import { useSessionStore } from '../../src/stores/sessionStore';
import { borrarTransaccion } from '../../src/features/transacciones/transaccionesService';
import { formatearMoneda } from '../../src/utils/dinero';
import { formatearFecha } from '../../src/utils/fecha';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';

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
  const router = useRouter();

  const onEditar = (id: string) => router.push(`/transaccion/nueva?editId=${id}`);

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
          <Pressable onPress={() => onEditar(item.id)} onLongPress={() => onBorrar(item.id)} style={s.row}>
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
  c: { flex: 1, padding: spacing.md },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.divider },
  chipOn: { backgroundColor: colors.primaryLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.divider },
  info: { flexShrink: 1 },
  desc: { fontSize: fontSize.md },
  fecha: { fontSize: fontSize.xs, color: colors.text.quaternary, marginTop: 2 },
  in: { color: colors.success, fontWeight: fontWeight.semibold },
  out: { color: colors.error, fontWeight: fontWeight.semibold },
  vacio: { paddingTop: 48, alignItems: 'center' },
  vacioTxt: { color: colors.text.tertiary, fontSize: fontSize.md },
});
