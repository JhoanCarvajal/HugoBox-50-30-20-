# Stack tecnológico — HugoBox

App móvil **Expo / React Native** (SDK 57) llamada **hugobox**, con New Architecture,
**Firebase** como backend y arquitectura por *features*.

> Última actualización: 2026-07-02

## 1. Lenguaje y framework principal
- **TypeScript** `~6.0.3` (modo `strict`, extiende `expo/tsconfig.base`)
- **React** `19.2.3` + **React Native** `0.86.0`
- **Expo** `~57.0.1` (SDK 57), con `expo-dev-client` `~57.0.3` (development client, no Expo Go)
- Soportes: `expo-constants`, `expo-asset`, `expo-linking`, `expo-status-bar`

## 2. Navegación / routing
- **Expo Router** `~57.0.2` (file-based routing). Estructura en `app/`: grupos `(auth)` y `(tabs)`, `transaccion/`, `_layout.tsx`
- Scheme de deep-linking: `hugobox`
- `react-native-screens` `4.25.2`, `react-native-safe-area-context` `~5.7.0`

## 3. Estado / data fetching
- **Zustand** `^5.0.14` (store en `src/stores/sessionStore.ts`)
- Data fetching contra Firestore mediante hooks propios por feature (`useCajas`, `useTransacciones`, `useHistorial`, `useAuth`)
- **No** usa Redux/RTK ni React Query

## 4. UI / estilos
- **@expo/vector-icons** `^15.0.2`
- **react-native-safe-area-context**
- Componentes UI propios en `src/components/ui/`; tema centralizado en `src/theme.ts`
- Sin librería de componentes de terceros (NativeBase, Tamagui, etc.)

## 5. Backend / servicios
- **Firebase** `^12.15.0` (SDK JS modular) — Auth + Firestore. Cliente en `src/lib/firebase.ts`
- **@react-native-google-signin/google-signin** `^16.1.2` (login con Google; registrado como plugin de Expo)
- **@react-native-async-storage/async-storage** `2.2.0` (persistencia local, típicamente auth de Firebase)
- Reglas de seguridad en `firestore.rules`; emuladores Auth (9099) y Firestore (8080) vía `firebase.json`

## 6. Validación y formularios
- **Zod** `^4.4.3` + **react-hook-form** `^7.80.0` para esquemas y formularios (`cajasSchema.ts`, `txSchema.ts`)

## 7. Testing
- **Jest** `^29.7.0` con **jest-expo** `^57.0.0`
- **@testing-library/react-native** `^14.0.1`
- **jsdom** `^20.0.3`, **@types/jest** `^29.5.14`
- Script `test:emulator`: corre los tests contra los emuladores de Firebase (`firebase emulators:exec ... jest --runInBand --forceExit`, proyecto `demo-hugobox`)
- ~22 archivos `*.test.ts(x)` en `__tests__` por feature y en `src/__tests__`, `app/__tests__`, `src/utils/__tests__`

## 8. Build / deploy
- **EAS Build** (`eas.json`), `projectId` `5afc9cbb-...`
  - Perfil `development` → `developmentClient`, buildType APK Android
  - Perfil `production` → Android `app-bundle` (AAB)
- Versionado remoto con auto-increment
- Sin `expo-updates` (no OTA updates)

## 9. Herramientas de desarrollo
- **TypeScript** estricto
- **Firebase CLI / Emulator Suite** (Auth + Firestore, con UI)
- **undici** `^7.28.0` (fetch/HTTP, probablemente para tests contra emulador)
- Scripts npm: `start`, `android`, `ios`, `web`, `test`, `test:watch`, `test:emulator`
- ⚠️ **No hay ESLint ni Prettier** configurados, ni config de Babel personalizada en la raíz

## Arquitectura general
Código en `src/` organizado por *features* (`auth`, `cajas`, `transacciones`), cada una con su:
- *service* (Firestore)
- *hooks*
- *schema* Zod

Y a nivel raíz de `src/`: `lib/` (Firebase), `stores/` (Zustand), `components/ui/`, `theme.ts` y `types/`.
