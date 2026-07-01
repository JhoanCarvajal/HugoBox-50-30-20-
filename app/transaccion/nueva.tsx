import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useTransacciones } from '../../src/features/transacciones/useTransacciones';
import { txFormSchema } from '../../src/features/transacciones/txSchema';
import { obtenerTransaccion } from '../../src/features/transacciones/transaccionesService';
import { useSessionStore } from '../../src/stores/sessionStore';
import { aCentavos, aUnidades, parsearMonto } from '../../src/utils/dinero';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';

export default function NuevaTx() {
  const { cajas } = useCajas();
  const { crearIngreso, crearEgreso, editar } = useTransacciones();
  const router = useRouter();
  const uid = useSessionStore((s) => s.usuario?.uid);
  const { editId: editIdParam } = useLocalSearchParams<{ editId?: string }>();
  // Expo Router puede entregar un array si el param se repite en la URL;
  // en la práctica siempre navegamos con un único valor.
  const editId = Array.isArray(editIdParam) ? editIdParam[0] : editIdParam;
  const esEdicion = !!editId;

  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cajaId, setCajaId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Modo edición: precarga la transacción existente y rellena el formulario.
  // En modo alta (sin editId) este efecto no hace nada, así que el
  // comportamiento actual del formulario no cambia.
  useEffect(() => {
    if (!editId || !uid) return;
    let cancelado = false;
    (async () => {
      try {
        const tx = await obtenerTransaccion(uid, editId);
        if (cancelado) return;
        if (!tx) {
          // La transacción ya no existe (p.ej. se borró en otro dispositivo).
          Alert.alert('No se encontró el movimiento', 'Es posible que ya se haya borrado.');
          router.back();
          return;
        }
        setTipo(tx.tipo);
        setMonto(String(aUnidades(tx.monto)));
        setDescripcion(tx.descripcion);
        setCajaId(tx.cajaId);
      } catch (err) {
        if (cancelado) return;
        // Fallo de red/Firestore al cargar: se informa y se vuelve en lugar de
        // dejar un formulario de edición vacío que sobrescribiría el movimiento.
        Alert.alert('No se pudo cargar el movimiento', err instanceof Error ? err.message : String(err));
        router.back();
      }
    })();
    return () => { cancelado = true; };
  }, [editId, uid]);

  const guardar = async () => {
    // En es-CO el separador decimal habitual es la coma ("100,50") y el de
    // miles puede ser punto o coma ("1.000" / "1,000"). `parsearMonto`
    // detecta cuál separador es el decimal (el último, si le siguen 1 o 2
    // dígitos) y descarta los demás como separadores de miles, así el
    // teclado numérico del dispositivo no rompe la validación ni produce
    // montos 1000x menores por confundir miles con decimales.
    const montoNumero = parsearMonto(monto);
    const parsed = txFormSchema.safeParse({
      tipo, monto: montoNumero, descripcion, cajaId,
    });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setError('');
    // El input está en unidades; los servicios trabajan en centavos enteros.
    const centavos = aCentavos(montoNumero);
    try {
      if (esEdicion) {
        await editar(editId!, { monto: centavos, descripcion, cajaId: cajaId ?? undefined });
      } else if (tipo === 'ingreso') {
        await crearIngreso(centavos, descripcion);
      } else {
        await crearEgreso(centavos, cajaId!, descripcion);
      }
      router.back();
    } catch (err) {
      // Si el servicio falla (red/Firestore caído), se informa al usuario y
      // se le deja en el formulario para reintentar en vez de navegar como
      // si el guardado hubiera funcionado.
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.c}>
      <View style={s.tabs}>
        {(['ingreso', 'egreso'] as const).map((t) => (
          <Pressable
            key={t}
            disabled={esEdicion}
            onPress={() => setTipo(t)}
            style={[s.tab, tipo === t && s.tabOn, esEdicion && s.tabDisabled]}
          >
            <Text style={tipo === t ? s.tabTxtOn : s.tabTxt}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={s.input} placeholder="0.00" keyboardType="numeric" value={monto} onChangeText={setMonto} />
      <Text style={s.hint}>Usa punto o coma para miles y decimales (ej: 1.500,50)</Text>
      <TextInput style={s.input} placeholder="Descripción" value={descripcion} onChangeText={setDescripcion} />
      {tipo === 'egreso' && (
        <View style={s.cajas}>
          {cajas.map((c) => (
            <Pressable key={c.id} onPress={() => setCajaId(c.id)} style={[s.chip, cajaId === c.id && s.chipOn]}>
              <Text style={cajaId === c.id ? s.chipTxtOn : undefined}>{c.nombre}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!!error && <Text style={s.err}>{error}</Text>}
      <Pressable style={s.btn} onPress={guardar}>
        <Text style={s.btnTxt}>{esEdicion ? 'Guardar cambios' : 'Guardar'}</Text>
      </Pressable>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  c: { padding: spacing.lg, gap: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.divider, alignItems: 'center',
  },
  tabOn: { backgroundColor: colors.primary },
  tabDisabled: { opacity: 0.5 },
  tabTxt: { color: colors.text.primary, textTransform: 'capitalize' },
  tabTxtOn: { color: colors.white, textTransform: 'capitalize' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md,
  },
  cajas: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.divider,
  },
  chipOn: { backgroundColor: colors.primary },
  chipTxtOn: { color: colors.white },
  hint: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: -8 },
  err: { color: colors.error },
  btn: {
    backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.sm, alignItems: 'center',
  },
  btnTxt: { color: colors.white, fontWeight: fontWeight.bold },
});
