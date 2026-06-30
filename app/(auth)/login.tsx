import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { entrarConGoogle } from '../../src/features/auth/authService';

export default function Login() {
  const [cargando, setCargando] = useState(false);
  const onPress = async () => {
    try { setCargando(true); await entrarConGoogle(); }
    catch (e) { Alert.alert('No se pudo iniciar sesión', String(e)); }
    finally { setCargando(false); }
  };
  return (
    <View style={s.c}>
      <Text style={s.titulo}>HugoBox</Text>
      <Text style={s.sub}>Tu presupuesto por cajas</Text>
      <Pressable style={s.btn} onPress={onPress} disabled={cargando}>
        <Text style={s.btnTxt}>{cargando ? 'Entrando…' : 'Continuar con Google'}</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  titulo: { fontSize: 32, fontWeight: '700' },
  sub: { fontSize: 16, color: '#666', marginBottom: 24 },
  btn: { backgroundColor: '#1a73e8', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 10 },
  btnTxt: { color: 'white', fontWeight: '600', fontSize: 16 },
});
