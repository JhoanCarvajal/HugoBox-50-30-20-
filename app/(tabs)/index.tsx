import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useSessionStore } from '../../src/stores/sessionStore';
import { CajaCard } from '../../src/components/CajaCard';
import { Avatar } from '../../src/components/ui/Avatar';
import { formatearMoneda } from '../../src/utils/dinero';
import { inicial } from '../../src/utils/colorCaja';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/theme';

/** Fecha larga capitalizada, p.ej. "Miércoles, 1 de julio". */
function fechaLarga(): string {
  try {
    const s = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return '';
  }
}

export default function Cajas() {
  const router = useRouter();
  const { cajas, cargando } = useCajas();
  const { items } = useHistorial();
  const usuario = useSessionStore((st) => st.usuario);

  const nombreMostrado = usuario?.displayName || usuario?.email || '';

  const balanceTotal = cajas.reduce((acc, c) => acc + c.saldo, 0);
  const ingresos = items
    .filter((t) => t.tipo === 'ingreso')
    .reduce((acc, t) => acc + t.monto, 0);
  const egresos = items
    .filter((t) => t.tipo === 'egreso')
    .reduce((acc, t) => acc + t.monto, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.c}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTxt}>
            <Text style={styles.fecha}>{fechaLarga()}</Text>
            <Text style={styles.saludo} numberOfLines={1}>
              Hola, {nombreMostrado}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/perfil')}
            accessibilityRole="button"
            accessibilityLabel="Ir a perfil"
          >
            <Avatar label={inicial(nombreMostrado || 'U')} filled shape="circle" size={44} />
          </Pressable>
        </View>

        {/* Balance total */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance total</Text>
          <Text style={styles.balanceMonto}>{formatearMoneda(balanceTotal)}</Text>
          <View style={styles.pills}>
            <View style={[styles.pill, styles.pillIn]}>
              <Text style={styles.pillLabelIn}>Ingresos</Text>
              <Text style={styles.pillMontoIn}>+{formatearMoneda(ingresos)}</Text>
            </View>
            <View style={[styles.pill, styles.pillOut]}>
              <Text style={styles.pillLabelOut}>Egresos</Text>
              <Text style={styles.pillMontoOut}>-{formatearMoneda(egresos)}</Text>
            </View>
          </View>
        </View>

        {/* Tus cajas */}
        <View style={styles.seccionHead}>
          <Text style={styles.seccionTitulo}>Tus cajas</Text>
          <Pressable onPress={() => router.push('/cajas')}>
            <Text style={styles.editar}>Editar</Text>
          </Pressable>
        </View>

        {cargando ? (
          <ActivityIndicator testID="dashboard-cargando" color={colors.primary} style={styles.loader} />
        ) : cajas.length === 0 ? (
          <Text style={styles.vacio}>Aún no tienes cajas</Text>
        ) : (
          <View style={styles.lista}>
            {cajas.map((caja, i) => (
              <CajaCard key={caja.id} caja={caja} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  c: { padding: spacing.lg, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTxt: { flexShrink: 1 },
  fecha: { fontSize: fontSize.sm, color: colors.text.tertiary },
  saludo: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  balanceLabel: { fontSize: fontSize.sm, color: colors.text.secondary },
  balanceMonto: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pills: { flexDirection: 'row', gap: spacing.md },
  pill: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pillIn: { backgroundColor: '#e6f4ea' },
  pillOut: { backgroundColor: '#fdecea' },
  pillLabelIn: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semibold },
  pillMontoIn: { fontSize: fontSize.md, color: colors.success, fontWeight: fontWeight.bold, marginTop: 2 },
  pillLabelOut: { fontSize: fontSize.xs, color: colors.error, fontWeight: fontWeight.semibold },
  pillMontoOut: { fontSize: fontSize.md, color: colors.error, fontWeight: fontWeight.bold, marginTop: 2 },
  seccionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seccionTitulo: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  editar: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  lista: { gap: spacing.md },
  loader: { marginTop: spacing.xl },
  vacio: {
    color: colors.text.tertiary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
