import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/features/auth/useAuth';
import { configurarGoogle } from '../src/features/auth/authService';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const { usuario, cargando } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { configurarGoogle(); }, []);
  useEffect(() => {
    if (cargando) return;
    const enAuth = segments[0] === '(auth)';
    if (!usuario && !enAuth) router.replace('/(auth)/login');
    else if (usuario && enAuth) router.replace('/(tabs)');
  }, [usuario, cargando, segments]);

  if (cargando) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  return (
    <ErrorBoundary>
      <Slot />
    </ErrorBoundary>
  );
}
