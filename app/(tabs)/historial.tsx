import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useSessionStore } from '../../src/stores/sessionStore';
import { borrarTransaccion } from '../../src/features/transacciones/transaccionesService';
import { filtrarHistorial, rangoFecha, ClaveRangoFecha } from '../../src/features/transacciones/filtros';
import { proyectarHistorial } from '../../src/features/transacciones/vistaHistorial';
import { Chip } from '../../src/components/ui/Chip';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { FilaMovimiento } from '../../src/components/FilaMovimiento';
import { colors, spacing, fontSize, fontWeight } from '../../src/theme';

const OPCIONES_FECHA: { clave: ClaveRangoFecha; etiqueta: string }[] = [
  { clave: 'todo', etiqueta: 'Todo' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'mesPasado', etiqueta: 'Mes pasado' },
  { clave: 'anio', etiqueta: 'Este año' },
];

type ClaveTipo = 'todos' | 'ingreso' | 'egreso';

const OPCIONES_TIPO: { value: ClaveTipo; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ingreso', label: 'Ingresos' },
  { value: 'egreso', label: 'Egresos' },
];

export default function Historial() {
  const router = useRouter();
  const { items } = useHistorial();
  const { cajas } = useCajas();
  const uid = useSessionStore((s) => s.usuario?.uid);

  const [filtroCaja, setFiltroCaja] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<ClaveTipo>('todos');
  const [filtroFecha, setFiltroFecha] = useState<ClaveRangoFecha>('todo');
  // Set y no un solo id: se pueden abrir varios repartos a la vez para
  // compararlos sin que abrir uno cierre el anterior.
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // El dashboard navega aquí con `?tipo=ingreso|egreso` desde sus pills. Se
  // resetean caja y fecha para que la lista coincida exactamente con la cifra
  // que el usuario acaba de tocar, y se limpia el parámetro: si se dejara
  // puesto, seguiría pegado a la ruta del tab y volvería a forzar el filtro
  // cada vez que se regresara al historial desde otro tab.
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();

  useEffect(() => {
    if (tipo !== 'ingreso' && tipo !== 'egreso') return;
    setFiltroTipo(tipo);
    setFiltroCaja(null);
    setFiltroFecha('todo');
    router.setParams({ tipo: undefined });
  }, [tipo]);

  // Cambiar la caja filtrada puede vaciar el `desglose` de una fila que
  // seguía expandida (un ingreso repartido deja de tocar la caja recién
  // filtrada): el chevron desaparece pero, sin este reseteo, el bloque
  // desplegado queda huérfano y sin control para cerrarlo. De paso corta una
  // fuga: el Set dejaba de vaciarse nunca y acumulaba ids de filas que ya ni
  // se muestran.
  useEffect(() => {
    setExpandidos(new Set());
  }, [filtroCaja]);

  const vistas = useMemo(() => {
    const { desde, hasta } = rangoFecha(filtroFecha, Date.now());
    // El SegmentedControl necesita un valor concreto para marcar el segmento
    // activo; el filtro usa `null` para «sin filtrar».
    const filtro = {
      cajaId: filtroCaja,
      tipo: filtroTipo === 'todos' ? null : filtroTipo,
      desde,
      hasta,
    };
    return proyectarHistorial(filtrarHistorial(items, filtro), filtro, cajas);
  }, [items, filtroCaja, filtroTipo, filtroFecha, cajas]);

  const alternarExpandido = (id: string) => {
    setExpandidos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

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

      <SegmentedControl<ClaveTipo>
        options={OPCIONES_TIPO}
        value={filtroTipo}
        onChange={setFiltroTipo}
      />

      <ScrollView testID="chips-caja" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
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
        data={vistas}
        keyExtractor={(v) => v.tx.id}
        ListHeaderComponent={encabezado}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <FilaMovimiento
            vista={item}
            expandido={expandidos.has(item.tx.id)}
            onToggle={alternarExpandido}
            onEditar={onEditar}
            onBorrar={onBorrar}
          />
        )}
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
  vacio: {
    color: colors.text.tertiary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
