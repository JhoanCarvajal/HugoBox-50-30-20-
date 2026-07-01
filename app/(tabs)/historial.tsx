import { useMemo, useState } from 'react';
import { View, FlatList, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useCajas } from '../../src/features/cajas/useCajas';
import { filtrarHistorial, rangoFecha, ClaveRangoFecha } from '../../src/features/transacciones/filtros';
import { useSessionStore } from '../../src/stores/sessionStore';
import { borrarTransaccion } from '../../src/features/transacciones/transaccionesService';
import { formatearMoneda } from '../../src/utils/dinero';
import { formatearFecha } from '../../src/utils/fecha';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/theme';
import { Chip } from '../../src/components/ui/Chip';

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
    <SafeAreaView style={s.c} edges={['top']}>
      <Text style={s.titulo}>Historial</Text>
      <View style={s.filtros}>
        <Chip label="Todas" active={!filtroCaja} onPress={() => setFiltroCaja(null)} />
        {cajas.map((c) => (
          <Chip
            key={c.id}
            label={c.nombre}
            active={filtroCaja === c.id}
            onPress={() => setFiltroCaja(c.id)}
          />
        ))}
      </View>
      <View style={s.filtros}>
        {OPCIONES_FECHA.map((o) => (
          <Chip
            key={o.clave}
            label={o.etiqueta}
            active={filtroFecha === o.clave}
            onPress={() => setFiltroFecha(o.clave)}
          />
        ))}
      </View>
      <FlatList
        data={itemsFiltrados}
        keyExtractor={(t) => t.id}
        contentContainerStyle={s.lista}
        renderItem={({ item }) => {
          const cajaNombre = cajas.find((c) => c.id === item.cajaId)?.nombre;
          const meta = cajaNombre
            ? `${cajaNombre} · ${formatearFecha(item.fecha)}`
            : formatearFecha(item.fecha);
          return (
            <Pressable onPress={() => onEditar(item.id)} onLongPress={() => onBorrar(item.id)} style={s.card}>
              <View style={s.info}>
                <Text style={s.desc}>{item.descripcion || item.tipo}</Text>
                <Text style={s.meta}>{meta}</Text>
              </View>
              <Text style={item.tipo === 'ingreso' ? s.in : s.out}>
                {item.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(item.monto)}
              </Text>
            </Pressable>
          );
        }}
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
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  titulo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  lista: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  info: { flexShrink: 1 },
  desc: { fontSize: fontSize.md, color: colors.text.primary },
  meta: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs },
  in: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.success },
  out: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.error },
  vacio: { paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg, alignItems: 'center' },
  vacioTxt: { color: colors.text.tertiary, fontSize: fontSize.md, textAlign: 'center' },
});
