import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useTransacciones } from '../../src/features/transacciones/useTransacciones';
import { txFormSchema } from '../../src/features/transacciones/txSchema';
import { obtenerTransaccion } from '../../src/features/transacciones/transaccionesService';
import { useSessionStore } from '../../src/stores/sessionStore';
import { aCentavos, aUnidades, parsearMonto } from '../../src/utils/dinero';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { MoneyInput } from '../../src/components/ui/MoneyInput';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { colors, spacing, fontSize, fontWeight } from '../../src/theme';

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
  // Campo al que pertenece el error de zod (issues[0].path); permite mostrarlo
  // en la prop `error` del TextField correspondiente en vez de un texto suelto.
  const [errorField, setErrorField] = useState('');
  // Bloquea el botón mientras se guarda: evita envíos duplicados y alimenta el
  // indicador de carga.
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Bloqueo de reentrada: aunque el botón ya se deshabilita con isSubmitting,
    // esto descarta cualquier segundo onPress que llegara antes del re-render.
    if (isSubmitting) return;
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
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue.message);
      setErrorField(String(issue.path[0] ?? ''));
      return;
    }
    setError('');
    setErrorField('');
    // El input está en unidades; los servicios trabajan en centavos enteros.
    const centavos = aCentavos(montoNumero);
    setIsSubmitting(true);
    try {
      if (esEdicion) {
        await editar(editId!, { monto: centavos, descripcion, cajaId: cajaId ?? undefined });
      } else if (tipo === 'ingreso') {
        await crearIngreso(centavos, descripcion);
      } else {
        await crearEgreso(centavos, cajaId!, descripcion);
      }
      // Solo se navega tras un guardado exitoso.
      router.back();
    } catch (err) {
      // Si el servicio falla (red/Firestore caído), se informa al usuario y
      // se le deja en el formulario para reintentar en vez de navegar como
      // si el guardado hubiera funcionado.
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : String(err));
    } finally {
      // Rehabilita el botón pase lo que pase, para poder reintentar tras un error.
      setIsSubmitting(false);
    }
  };

  const esIngreso = tipo === 'ingreso';
  const botonLabel = esEdicion
    ? 'Guardar cambios'
    : (esIngreso ? 'Registrar ingreso' : 'Registrar egreso');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.back}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </Pressable>
        <Text style={s.title}>Nueva transacción</Text>
      </View>
      <ScrollView contentContainerStyle={s.c} keyboardShouldPersistTaps="handled">

      <SegmentedControl<'ingreso' | 'egreso'>
        options={[
          { value: 'ingreso', label: 'Ingreso' },
          { value: 'egreso', label: 'Egreso' },
        ]}
        value={tipo}
        // En modo edición el tipo no se puede cambiar (comportamiento previo del
        // switch deshabilitado): se ignoran los cambios.
        onChange={esEdicion ? () => {} : setTipo}
        activeColor={esIngreso ? colors.success : colors.error}
      />

      <MoneyInput
        label="Monto"
        large
        value={monto}
        onChangeValue={setMonto}
        error={errorField === 'monto' ? error : undefined}
      />

      <TextField
        label="Descripción"
        placeholder="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        error={errorField === 'descripcion' ? error : undefined}
      />

      {tipo === 'egreso' && (
        <View style={s.cajas}>
          {cajas.map((c) => (
            <Chip
              key={c.id}
              label={c.nombre}
              active={cajaId === c.id}
              onPress={() => setCajaId(c.id)}
            />
          ))}
        </View>
      )}
      {errorField === 'cajaId' && !!error && <Text style={s.err}>{error}</Text>}

      <Button
        block
        variant={esIngreso ? 'success' : 'destructive'}
        label={botonLabel}
        onPress={guardar}
        loading={isSubmitting}
        disabled={isSubmitting}
      />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  back: { padding: spacing.xs },
  c: { padding: spacing.lg, gap: spacing.md },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    paddingBottom: spacing.xs,
  },
  cajas: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
  },
  err: { fontSize: fontSize.sm, color: colors.error },
});
