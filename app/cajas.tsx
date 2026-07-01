import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCajas } from '../src/features/cajas/useCajas';
import { useSessionStore } from '../src/stores/sessionStore';
import { crearCaja, actualizarPorcentajes } from '../src/features/cajas/cajasService';
import { nuevaCajaSchema } from '../src/features/cajas/cajasSchema';

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

      <Text style={s.h}>Porcentajes (deben sumar 100)</Text>
      <Text style={[s.suma, suma !== 100 && s.sumaError]}>
        Suma actual: {suma}
        {suma !== 100 ? ' — debe ser 100 para guardar' : ' ✓'}
      </Text>
      {cajas.map((c) => (
        <View key={c.id} style={s.row}>
          <Text style={s.nombre}>{c.nombre}</Text>
          <TextInput
            testID={`pct-${c.id}`}
            style={s.pct}
            keyboardType="numeric"
            value={pcts[c.id] ?? ''}
            onChangeText={(v) => setPcts((p) => ({ ...p, [c.id]: v }))}
          />
          <Text>%</Text>
        </View>
      ))}
      {!!error && <Text style={s.err}>{error}</Text>}
      <Pressable style={s.btn} onPress={guardarPcts}><Text style={s.btnTxt}>Guardar %</Text></Pressable>

      <Text style={s.h}>Nueva caja</Text>
      <TextInput style={s.input} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <TextInput style={s.input} placeholder="Porcentaje" keyboardType="numeric" value={nuevoPct} onChangeText={setNuevoPct} />
      <Pressable style={s.btn} onPress={agregar}><Text style={s.btnTxt}>Agregar caja</Text></Pressable>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  back: { paddingVertical: 4 },
  backTxt: { color: '#1a73e8', fontWeight: '600' },
  h: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  suma: { color: '#2e7d32', fontWeight: '600' },
  sumaError: { color: '#d32f2f' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { flex: 1 },
  pct: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, width: 64, textAlign: 'right',
  },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12,
  },
  err: { color: '#d32f2f' },
  btn: {
    backgroundColor: '#1a73e8', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 6,
  },
  btnTxt: { color: 'white', fontWeight: '700' },
});
