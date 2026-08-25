import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { listarCajas } from '../src/features/cajas/cajasService';
import { generarMovimientosDemo } from '../src/features/dev/generarDemo';
import { sembrarMovimientos } from '../src/features/dev/sembrar';
import { useSessionStore } from '../src/stores/sessionStore';
import { Caja } from '../src/types/models';
import { colors, spacing, radius, fontSize, fontWeight } from '../src/theme';

const CANTIDAD = 30;
const MESES = 3;

/**
 * Pantalla de desarrollo: siembra movimientos de prueba en la cuenta activa.
 * Usa los servicios reales, así que los saldos y repartos quedan consistentes.
 */
export default function DevSeed() {
  const usuario = useSessionStore((s) => s.usuario);
  const [cajas, setCajas] = useState<Caja[] | null>(null);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    listarCajas(usuario.uid).then(setCajas).catch((e) => setError(String(e)));
  }, [usuario]);

  async function sembrar() {
    if (!usuario || !cajas?.length) return;
    setError(null);
    setResultado(null);
    setProgreso({ hechos: 0, total: CANTIDAD });

    try {
      const movimientos = generarMovimientosDemo({
        cajas,
        cantidad: CANTIDAD,
        hasta: Date.now(),
        meses: MESES,
        semilla: Math.floor(Math.random() * 1_000_000),
      });

      const creados = await sembrarMovimientos(usuario.uid, movimientos, {
        onProgreso: (hechos, total) => setProgreso({ hechos, total }),
      });

      setResultado(`Listo: ${creados} movimientos creados en los últimos ${MESES} meses.`);
      setCajas(await listarCajas(usuario.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgreso(null);
    }
  }

  if (!__DEV__) return null;

  const sinCajas = cajas !== null && cajas.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: 'Datos de prueba' }} />
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.titulo}>Datos de prueba</Text>
        <Text style={styles.ayuda}>
          Crea {CANTIDAD} movimientos repartidos en los últimos {MESES} meses sobre tus cajas
          actuales. Los ingresos se reparten por porcentaje y los egresos nunca dejan una caja
          en negativo.
        </Text>

        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaTitulo}>Cuenta</Text>
          <Text style={styles.tarjetaValor}>{usuario?.email ?? 'sin sesión'}</Text>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaTitulo}>Cajas existentes</Text>
          {cajas === null ? (
            <Text style={styles.tarjetaValor}>Cargando…</Text>
          ) : sinCajas ? (
            <Text style={styles.error}>No hay cajas. Crea cajas antes de sembrar.</Text>
          ) : (
            cajas.map((c) => (
              <Text key={c.id} style={styles.tarjetaValor}>
                {c.nombre} · {c.porcentaje}%
              </Text>
            ))
          )}
        </View>

        <Button
          label={progreso ? `Sembrando ${progreso.hechos}/${progreso.total}…` : `Sembrar ${CANTIDAD} movimientos`}
          onPress={sembrar}
          loading={progreso !== null}
          disabled={!usuario || !cajas?.length}
          block
          testID="btn-sembrar"
        />

        {resultado ? <Text style={styles.ok}>{resultado}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  contenido: { padding: spacing.lg, gap: spacing.md },
  titulo: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text.primary },
  ayuda: { fontSize: fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tarjetaTitulo: { fontSize: fontSize.sm, color: colors.text.tertiary },
  tarjetaValor: { fontSize: fontSize.md, color: colors.text.primary },
  ok: { color: colors.success, fontSize: fontSize.md },
  error: { color: colors.error, fontSize: fontSize.sm },
});
