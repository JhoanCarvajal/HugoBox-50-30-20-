// Configuración global de tests.

// Tests de integración contra el Firebase Emulator: el cliente SDK necesita un
// projectId que coincida con el del emulador (demo-hugobox) y valores no vacíos
// para el resto de la config. Solo se aplican si no vienen ya del entorno.
process.env.EXPO_PUBLIC_FB_PROJECT_ID ||= 'demo-hugobox';
process.env.EXPO_PUBLIC_FB_API_KEY ||= 'demo-api-key';
process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN ||= 'demo-hugobox.firebaseapp.com';
process.env.EXPO_PUBLIC_FB_STORAGE_BUCKET ||= 'demo-hugobox.appspot.com';
process.env.EXPO_PUBLIC_FB_SENDER_ID ||= '0';
process.env.EXPO_PUBLIC_FB_APP_ID ||= 'demo-app-id';

// `src/lib/firebase.ts` usa AsyncStorage como persistencia de Auth (getReactNativePersistence).
// Bajo Jest no hay módulo nativo real, así que se usa el mock oficial en memoria del paquete
// (no afecta las pruebas contra el Emulator: solo reemplaza el storage local de tokens).
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line global-require
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// react-native-safe-area-context necesita un SafeAreaProvider en runtime. En tests
// que renderizan pantallas aisladas no hay provider, así que se usa el mock oficial
// (insets en 0, SafeAreaView como View).
jest.mock('react-native-safe-area-context', () =>
  // El mock oficial expone todo bajo `default`; lo devolvemos como el módulo.
  // eslint-disable-next-line global-require
  require('react-native-safe-area-context/jest/mock').default);

// El `setupFiles` de jest-expo (corre antes que este `setupFilesAfterEnv`) instala el
// polyfill "Winter" de Expo, que reemplaza `global.fetch` por un stub respaldado por un
// NativeModule inexistente bajo Jest (sus métodos como `text()` no hacen nada). El SDK de
// Firebase Auth/Firestore usa `fetch` para hablar con los emuladores vía REST, así que con
// el stub roto las llamadas devuelven respuestas vacías y fallan con `auth/network-request-failed`.
// Se restaura el `fetch` real de Node (vía `undici`, la implementación que usa Node internamente)
// para que las pruebas de integración contra el Emulator funcionen.
// eslint-disable-next-line global-require
const { fetch, Headers, Request, Response } = require('undici');
(globalThis as any).fetch = fetch;
(globalThis as any).Headers = Headers;
(globalThis as any).Request = Request;
(globalThis as any).Response = Response;

// Firestore usa el transporte WebChannel (long-polling), que llama a `new XMLHttpRequest()`
// directamente (no usa `fetch`) y no existe en el entorno Node de Jest. Se provee una
// implementación real (de `jsdom`, ya presente como dependencia transitiva) para que las
// escrituras/lecturas contra el Firestore Emulator funcionen en las pruebas de integración.
// eslint-disable-next-line global-require
const { JSDOM } = require('jsdom');
const { window: jsdomWindow } = new JSDOM('', { url: 'http://localhost/' });
(globalThis as any).XMLHttpRequest = jsdomWindow.XMLHttpRequest;

// `@react-native-google-signin/google-signin` envuelve un módulo nativo que no existe
// bajo Jest. Se mockea para poder importar `authService` (y sus tests de comportamiento
// contra el Firebase Emulator, que no ejercitan el flujo de Google sino `asegurarUsuario`).
// `isSuccessResponse` se mockea con la misma lógica que la real (discrimina por `type`)
// porque `authService.entrarConGoogle` la usa para angostar el `SignInResponse`.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  isSuccessResponse: jest.fn((response) => response?.type === 'success'),
}));
