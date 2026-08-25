import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useSessionStore } from '../../src/stores/sessionStore';
import { borrarTransaccion } from '../../src/features/transacciones/transaccionesService';
import { filtrarHistorial, rangoFecha, ClaveRangoFecha } from '../../src/features/transacciones/filtros';
import { proyectarHistorial, resumirVistas } from '../../src/features/transacciones/vistaHistorial';
import { Chip } from '../../src/components/ui/Chip';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { FilaMovimiento } from '../../src/components/FilaMovimiento';
import { formatearMoneda } from '../../src/utils/dinero';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';

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

/** Un cero no es ni entrada ni salida: el signo solo estorba. */
function conSigno(monto: number, signo: '+' | '-'): string {
  return monto === 0 ? formatearMoneda(0) : `${signo}${formatearMoneda(monto)}`;
}

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

  // El dashboard navega aquí con `?tipo=ingreso|egreso` desde sus pills y con
  // `?cajaId=<id>` desde sus tarjetas de caja. En ambos casos se resetean los
  // otros dos filtros para que la lista coincida exactamente con la cifra que
  // el usuario acaba de tocar, y se limpia el parámetro: si se dejara puesto,
  // seguiría pegado a la ruta del tab y volvería a forzar el filtro cada vez
  // que se regresara al historial desde otro tab.
  //
  // Un solo efecto para los dos parámetros, no uno por cada uno: dos efectos
  // encadenarían dos `router.setParams` en el mismo render y el segundo
  // pisaría al primero.
  const { tipo, cajaId } = useLocalSearchParams<{ tipo?: string; cajaId?: string }>();

  useEffect(() => {
    if (tipo === 'ingreso' || tipo === 'egreso') {
      setFiltroTipo(tipo);
      setFiltroCaja(null);
      setFiltroFecha('todo');
      router.setParams({ tipo: undefined });
      return;
    }

    // No se valida contra `cajas`: esa lista llega asíncrona y en el primer
    // render viene vacía, así que comprobar la pertenencia aquí descartaría
    // un filtro válido. El id lo emite nuestro propio dashboard.
    if (cajaId) {
      setFiltroCaja(cajaId);
      setFiltroTipo('todos');
      setFiltroFecha('todo');
      router.setParams({ cajaId: undefined });
    }
  }, [tipo, cajaId]);

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

  const resumen = useMemo(() => resumirVistas(vistas), [vistas]);

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

      {/* Cuánto suma lo que hay debajo. Las etiquetas no reusan «Ingresos» y
          «Egresos» para no repetir al pie de la letra el segmento que va justo
          encima. Con el segmento en un tipo concreto la otra columna siempre
          sería cero, así que se colapsa a una sola cifra. */}
      {filtroTipo === 'todos' ? (
        <View style={styles.resumen}>
          <View>
            <Text style={styles.resumenEtiqueta}>Entró</Text>
            <Text testID="resumen-ingresos" style={[styles.resumenMonto, styles.in]}>
              {conSigno(resumen.ingresos, '+')}
            </Text>
          </View>
          <View>
            <Text style={styles.resumenEtiqueta}>Salió</Text>
            <Text testID="resumen-egresos" style={[styles.resumenMonto, styles.out]}>
              {conSigno(resumen.egresos, '-')}
            </Text>
          </View>
          <View style={styles.resumenNeto}>
            <Text style={styles.resumenEtiqueta}>Neto</Text>
            <Text
              testID="resumen-neto"
              style={[styles.resumenMonto, resumen.neto < 0 ? styles.out : styles.in]}
            >
              {formatearMoneda(resumen.neto)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.resumen, styles.resumenUnaLinea]}>
          <Text style={styles.resumenEtiqueta}>
            {filtroTipo === 'ingreso' ? 'Entró' : 'Salió'}
          </Text>
          <Text
            testID="resumen-unico"
            style={[styles.resumenMonto, filtroTipo === 'ingreso' ? styles.in : styles.out]}
          >
            {filtroTipo === 'ingreso'
              ? conSigno(resumen.ingresos, '+')
              : conSigno(resumen.egresos, '-')}
          </Text>
        </View>
      )}
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
  resumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  resumenUnaLinea: { alignItems: 'center' },
  resumenNeto: { alignItems: 'flex-end' },
  resumenEtiqueta: { fontSize: fontSize.xs, color: colors.text.tertiary },
  resumenMonto: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 2 },
  in: { color: colors.success },
  out: { color: colors.error },
  vacio: {
    color: colors.text.tertiary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
