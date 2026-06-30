import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  connectAuthEmulator,
  type Persistence,
} from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// `getReactNativePersistence` SÍ existe en runtime (Metro lo resuelve vía la condición
// "react-native" del SDK), pero firebase@12 (y @firebase/auth@1.x) no lo expone en los
// tipos públicos de `firebase/auth`: el mapa "exports" del paquete fija la clave "types"
// genérica ANTES de la condición "react-native", así que el resolver de TypeScript
// (moduleResolution "bundler") nunca llega a los tipos correctos (`dist/rn/index.rn.d.ts`).
// Se amplía el módulo localmente para tipar la función real (mismo símbolo, mismo runtime).
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FB_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FB_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FB_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FB_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FB_APP_ID!,
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // estabilidad en RN
});

export function conectarEmuladores() {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
