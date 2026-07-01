import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCajas } from '../src/features/cajas/useCajas';
import { useSessionStore } from '../src/stores/sessionStore';
import { crearCaja, actualizarPorcentajes } from '../src/features/cajas/cajasService';
import { nuevaCajaSchema } from '../src/features/cajas/cajasSchema';
import {
  colors, spacing, radius, fontSize, fontWeight, shadows,
} from '../src/theme';
import { Button } from '../src/components/ui/Button';
import { TextField } from '../src/components/ui/TextField';

export default function GestionCajas() {
  const { cajas } = useCajas();
  const uid = useSessionStore((s) => s.usuario?.uid)!;
  const router = useRouter();
  const [pcts, setPcts] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState('');
  const [nuevoPct, setNuevoPct] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPcts(Object.fromEntries(cajas.map((c) => [c.id, String(c.porcentaje)])));
  }, [cajas.length]);

  // Suma en vivo de los % editados (no persistidos todavía). Es solo texto de
  // ayuda: el invariante real lo exige `actualizarPorcentajes`/`crearCaja`
  // (vía `validarSumaPorcentajes`), no un bloqueo aquí.
  const suma = useMemo(
    () => cajas.reduce((acc, c) => acc + Number(pcts[c.id] ?? c.porcentaje), 0),
    [cajas, pcts],
  );
  const sumaOk = suma === 100;
  // Relleno de la barra de progreso hacia 100 (solo presentación).
  const barPct = Math.max(0, Math.min(suma, 100));

  // Decisión: NO se pre-valida la suma en el cliente antes de llamar al
  // servicio (evita duplicar la regla de negocio, que ya vive en
  // `validarSumaPorcentajes` dentro de `cajasService`). Se deja que el
  // servicio lance y se captura el error para mostrarlo al usuario, tal como
  // pide el contexto de la tarea.
  const guardarPcts = async () => {
    const cambios = cajas.map((c) => ({
      id: c.id,
      porcentaje: Number(pcts[c.id] ?? c.porcentaje),
    }));
    if (cambios.some((c) => Number.isNaN(c.porcentaje))) {
      const msg = 'Ingresa solo números en los porcentajes';
      setError(msg);
      Alert.alert('Revisa los %', msg);
      return;
    }
    try {
      await actualizarPorcentajes(uid, cambios);
      setError('');
      Alert.alert('Listo', 'Porcentajes actualizados');
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      Alert.alert('Revisa los %', msg);
    }
  };

  // Aquí sí se valida en el cliente con `nuevaCajaSchema` (nombre 1-40,
  // porcentaje 0-100): esa forma NO la revisa `crearCaja` en runtime, así
  // que es responsabilidad de la pantalla. La suma=100, en cambio, se deja
  // en manos del servicio (mismo criterio que en `guardarPcts`).
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
      const msg = (e as Error).message;
      setError(msg);
      Alert.alert('No se pudo crear', msg);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.c}>
      <Pressable onPress={() => router.back()} style={s.back}>
        <Text style={s.backTxt}>← Volver</Text>
      </Pressable>

      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.h}>Porcentajes</Text>
          <Text style={s.hSub}>Deben sumar 100</Text>
        </View>

        <View style={s.progressTrack}>
          <View
            style={[
              s.progressFill,
              { width: `${barPct}%`, backgroundColor: sumaOk ? colors.success : colors.error },
            ]}
          />
        </View>
        <Text style={[s.suma, !sumaOk && s.sumaError]}>
          Suma actual: {suma}
          {sumaOk ? ' ✓' : ' — debe ser 100 para guardar'}
        </Text>

        {cajas.map((c) => (
          <View key={c.id} style={s.row}>
            <Text style={s.nombre}>{c.nombre}</Text>
            <View style={s.pctField}>
              <TextField
                testID={`pct-${c.id}`}
                keyboardType="numeric"
                value={pcts[c.id] ?? ''}
                onChangeText={(v) => setPcts((p) => ({ ...p, [c.id]: v }))}
                style={s.pctInput}
              />
            </View>
            <Text style={s.pctSign}>%</Text>
          </View>
        ))}

        {!!error && <Text style={s.err}>{error}</Text>}
        <Button label="Guardar %" onPress={guardarPcts} block style={s.cta} />
      </View>

      <View style={s.card}>
        <Text style={s.h}>Nueva caja</Text>
        <TextField placeholder="Nombre" value={nombre} onChangeText={setNombre} />
        <TextField
          placeholder="Porcentaje"
          keyboardType="numeric"
          value={nuevoPct}
          onChangeText={setNuevoPct}
        />
        <Button label="Agregar caja" onPress={agregar} block style={s.cta} />
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  c: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  backTxt: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  cardHeader: { gap: spacing.xs },
  h: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary },
  hSub: { fontSize: fontSize.sm, color: colors.text.secondary },
  progressTrack: {
    height: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill },
  suma: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold },
  sumaError: { color: colors.error },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nombre: { flex: 2, fontSize: fontSize.md, color: colors.text.primary },
  pctField: { flex: 1 },
  pctInput: { textAlign: 'right', paddingVertical: spacing.sm },
  pctSign: { fontSize: fontSize.md, color: colors.text.secondary },
  err: { fontSize: fontSize.sm, color: colors.error },
  cta: { marginTop: spacing.xs },
});
