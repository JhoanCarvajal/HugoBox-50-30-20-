import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useSessionStore } from '../../src/stores/sessionStore';
import { crearCaja, actualizarPorcentajes } from '../../src/features/cajas/cajasService';
import { nuevaCajaSchema } from '../../src/features/cajas/cajasSchema';
import { TextField } from '../../src/components/ui/TextField';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { colorCaja, inicial } from '../../src/utils/colorCaja';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/theme';

export default function GestionCajas() {
  const { cajas } = useCajas();
  const uid = useSessionStore((s) => s.usuario?.uid)!;

  const [pcts, setPcts] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState('');
  const [nuevoPct, setNuevoPct] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPcts(Object.fromEntries(cajas.map((c) => [c.id, String(c.porcentaje)])));
  }, [cajas.length]);

  const suma = useMemo(
    () => cajas.reduce((acc, c) => acc + Number(pcts[c.id] ?? c.porcentaje), 0),
    [cajas, pcts],
  );
  const sumaOk = suma === 100;

  const setPct = (id: string, v: string) => setPcts((p) => ({ ...p, [id]: v }));
  const paso = (id: string, delta: number, base: number) => {
    const actual = Number(pcts[id] ?? base);
    const nuevo = Math.max(0, Math.min(100, (Number.isNaN(actual) ? base : actual) + delta));
    setPct(id, String(nuevo));
  };

  const guardarPcts = async () => {
    const cambios = cajas.map((c) => ({ id: c.id, porcentaje: Number(pcts[c.id] ?? c.porcentaje) }));
    if (cambios.some((c) => Number.isNaN(c.porcentaje))) {
      setError('Ingresa solo números en los porcentajes');
      Alert.alert('Revisa los %', 'Ingresa solo números en los porcentajes');
      return;
    }
    try {
      await actualizarPorcentajes(uid, cambios);
      setError('');
      Alert.alert('Listo', 'Porcentajes actualizados');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron guardar';
      setError(msg);
      Alert.alert('Revisa los %', msg);
    }
  };

  const agregar = async () => {
    const parsed = nuevaCajaSchema.safeParse({ nombre, porcentaje: Number(nuevoPct) });
    if (!parsed.success) {
      const msg = parsed.error.issues[0].message;
      setError(msg);
      Alert.alert('Datos inválidos', msg);
      return;
    }
    try {
      await crearCaja(uid, parsed.data, cajas.map((c) => c.porcentaje));
      setError('');
      setNombre('');
      setNuevoPct('');
      Alert.alert('Listo', 'Caja creada');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear';
      setError(msg);
      Alert.alert('No se pudo crear', msg);
    }
  };

  const estadoTxt = sumaOk
    ? 'Todo asignado'
    : suma < 100
      ? `Faltan ${Math.round(100 - suma)}%`
      : `Sobran ${Math.round(suma - 100)}%`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.c}>
        <View>
          <Text style={styles.titulo}>Distribución</Text>
          <Text style={styles.subtitulo}>Cómo se reparte cada ingreso entre tus cajas</Text>
        </View>

        {/* Estado */}
        <View style={styles.estadoCard}>
          <Text style={styles.estadoLabel}>Estado</Text>
          <Text style={[styles.estadoValor, { color: sumaOk ? colors.success : colors.error }]}>
            {estadoTxt}
          </Text>
        </View>

        {/* Cajas con stepper */}
        {cajas.map((c, i) => {
          const par = colorCaja(i);
          const valor = Number(pcts[c.id] ?? c.porcentaje);
          return (
            <View key={c.id} style={styles.cajaCard}>
              <View style={styles.cajaFila}>
                <Avatar label={inicial(c.nombre)} color={par.color} tint={par.tint} size={36} shape="rounded" />
                <Text style={styles.cajaNombre} numberOfLines={1}>{c.nombre}</Text>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => paso(c.id, -5, c.porcentaje)}
                  accessibilityRole="button"
                  accessibilityLabel={`Disminuir ${c.nombre}`}
                >
                  <Ionicons name="remove" size={18} color={colors.primary} />
                </Pressable>
                <View style={styles.pctBox}>
                  <TextInput
                    testID={`pct-${c.id}`}
                    style={styles.pctInput}
                    keyboardType="numeric"
                    value={pcts[c.id] ?? ''}
                    onChangeText={(v) => setPct(c.id, v)}
                    textAlign="right"
                  />
                  <Text style={styles.pctSigno}>%</Text>
                </View>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => paso(c.id, 5, c.porcentaje)}
                  accessibilityRole="button"
                  accessibilityLabel={`Aumentar ${c.nombre}`}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                </Pressable>
              </View>
              <ProgressBar
                value={(Number.isNaN(valor) ? 0 : valor) / 100}
                color={par.color}
                style={styles.barra}
              />
            </View>
          );
        })}

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <Button label="Guardar distribución" variant="primary" block onPress={guardarPcts} />

        {/* Nueva caja */}
        <View style={styles.nuevaCard}>
          <Text style={styles.nuevaTitulo}>Nueva caja</Text>
          <TextField placeholder="Nombre" value={nombre} onChangeText={setNombre} />
          <TextField
            placeholder="Porcentaje"
            keyboardType="numeric"
            value={nuevoPct}
            onChangeText={setNuevoPct}
          />
          <Button label="Agregar caja" variant="primary" block onPress={agregar} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  c: { padding: spacing.lg, gap: spacing.md },
  titulo: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary },
  subtitulo: { fontSize: fontSize.sm, color: colors.text.tertiary, marginTop: 2 },
  estadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  estadoLabel: { fontSize: fontSize.md, color: colors.text.primary },
  estadoValor: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  cajaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  cajaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cajaNombre: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text.primary },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctBox: { flexDirection: 'row', alignItems: 'center', minWidth: 56, justifyContent: 'flex-end' },
  pctInput: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    minWidth: 32,
    padding: 0,
  },
  pctSigno: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text.primary, marginLeft: 2 },
  barra: { marginTop: spacing.md },
  err: { color: colors.error, fontSize: fontSize.sm },
  nuevaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
    marginTop: spacing.sm,
  },
  nuevaTitulo: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text.primary },
});
