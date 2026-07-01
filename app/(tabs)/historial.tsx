import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useSessionStore } from '../../src/stores/sessionStore';
import { borrarTransaccion } from '../../src/features/transacciones/transaccionesService';
import { filtrarHistorial, rangoFecha, ClaveRangoFecha } from '../../src/features/transacciones/filtros';
import { formatearMoneda } from '../../src/utils/dinero';
import { formatearFecha } from '../../src/utils/fecha';
import { Chip } from '../../src/components/ui/Chip';
import { Avatar } from '../../src/components/ui/Avatar';
import { inicial } from '../../src/utils/colorCaja';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/theme';

const OPCIONES_FECHA: { clave: ClaveRangoFecha; etiqueta: string }[] = [
  { clave: 'todo', etiqueta: 'Todo' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'mesPasado', etiqueta: 'Mes pasado' },
  { clave: 'anio', etiqueta: 'Este año' },
];

export default function Historial() {
  const router = useRouter();
  const { items } = useHistorial();
  const { cajas } = useCajas();
  const uid = useSessionStore((s) => s.usuario?.uid);

  const [filtroCaja, setFiltroCaja] = useState<string | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<ClaveRangoFecha>('todo');

  const itemsFiltrados = useMemo(() => {
    const { desde, hasta } = rangoFecha(filtroFecha, Date.now());
    return filtrarHistorial(items, { cajaId: filtroCaja, desde, hasta });
  }, [items, filtroCaja, filtroFecha]);

  const onEditar = (id: string) => router.push(`/transaccion/nueva?editId=${id}`);

  const onBorrar = (id: string) => {
    Alert.alert('Borrar', '¿Eliminar este movimiento? Se revertirán los saldos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          if (!uid) return;
          try {
            await borrarTransaccion(uid, id);
          } catch (err) {
            Alert.alert('No se pudo borrar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  };

  const encabezado = (
    <View style={styles.head}>
      <Text style={styles.titulo}>Historial</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Todas" active={!filtroCaja} onPress={() => setFiltroCaja(null)} />
        {cajas.map((c) => (
          <Chip key={c.id} label={c.nombre} active={filtroCaja === c.id} onPress={() => setFiltroCaja(c.id)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {OPCIONES_FECHA.map((o) => (
          <Chip key={o.clave} label={o.etiqueta} active={filtroFecha === o.clave} onPress={() => setFiltroFecha(o.clave)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={itemsFiltrados}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={encabezado}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => {
          const esIngreso = item.tipo === 'ingreso';
          const cajaNombre = item.cajaId
            ? cajas.find((c) => c.id === item.cajaId)?.nombre
            : esIngreso
              ? 'Reparto'
              : undefined;
          const meta = cajaNombre
            ? `${cajaNombre} · ${formatearFecha(item.fecha)}`
            : formatearFecha(item.fecha);
          const desc = item.descripcion || item.tipo;
          return (
            <Pressable style={styles.row} onPress={() => onEditar(item.id)} onLongPress={() => onBorrar(item.id)}>
              <Avatar label={inicial(desc)} color={colors.text.tertiary} tint={colors.divider} size={40} shape="circle" />
              <View style={styles.info}>
                <Text style={styles.desc} numberOfLines={1}>{desc}</Text>
                <Text style={styles.meta}>{meta}</Text>
              </View>
              <Text style={[styles.monto, esIngreso ? styles.in : styles.out]}>
                {esIngreso ? '+' : '-'}{formatearMoneda(item.monto)}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {items.length === 0 ? 'Aún no tienes movimientos' : 'No hay movimientos con estos filtros'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  lista: { padding: spacing.lg, gap: spacing.sm },
  head: { gap: spacing.sm, marginBottom: spacing.sm },
  titulo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  info: { flex: 1 },
  desc: { fontSize: fontSize.md, color: colors.text.primary },
  meta: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 },
  monto: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  in: { color: colors.success },
  out: { color: colors.error },
  vacio: {
    color: colors.text.tertiary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
