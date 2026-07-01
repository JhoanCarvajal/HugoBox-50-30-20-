import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useTransacciones } from '../../src/features/transacciones/useTransacciones';
import { txFormSchema } from '../../src/features/transacciones/txSchema';
import { aCentavos, parsearMonto } from '../../src/utils/dinero';

export default function NuevaTx() {
  const { cajas } = useCajas();
  const { crearIngreso, crearEgreso } = useTransacciones();
  const router = useRouter();
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cajaId, setCajaId] = useState<string | null>(null);
  const [error, setError] = useState('');

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
      if (tipo === 'ingreso') await crearIngreso(centavos, descripcion);
      else await crearEgreso(centavos, cajaId!, descripcion);
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
          <Pressable key={t} onPress={() => setTipo(t)} style={[s.tab, tipo === t && s.tabOn]}>
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
      <Pressable style={s.btn} onPress={guardar}><Text style={s.btnTxt}>Guardar</Text></Pressable>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  c: { padding: 16, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center',
  },
  tabOn: { backgroundColor: '#1a73e8' },
  tabTxt: { color: '#333', textTransform: 'capitalize' },
  tabTxtOn: { color: 'white', textTransform: 'capitalize' },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12,
  },
  cajas: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#eee',
  },
  chipOn: { backgroundColor: '#1a73e8' },
  chipTxtOn: { color: 'white' },
  hint: { fontSize: 12, color: '#888', marginTop: -8 },
  err: { color: '#d32f2f' },
  btn: {
    backgroundColor: '#1a73e8', padding: 14, borderRadius: 10, alignItems: 'center',
  },
  btnTxt: { color: 'white', fontWeight: '700' },
});
