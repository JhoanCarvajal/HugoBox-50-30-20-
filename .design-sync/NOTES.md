# Notas de design-sync — HugoBox

## Enfoque adoptado: vistas previas HTML (no el flujo canónico)

Este repo es una **app React Native / Expo** (`"main": "expo-router/entry"`, `private: true`), **sin `dist/`, sin Storybook, sin build esbuild-bundlable**. Está **fuera del envelope** de la skill `/design-sync`, cuyo flujo canónico empaqueta componentes web reales (`_ds_bundle.js`) que renderizan en el navegador. Los componentes RN (`View`/`Text`/`StyleSheet`) no renderizan en el runtime web de Claude Design sin `react-native-web` + bundling que aquí no existe.

Por eso el design system se subió como **vistas previas HTML representativas** (fieles a la marca y a los tokens de `src/theme.ts`), no como componentes compilados. Sirven como referencia visual para que el agente de Claude Design diseñe on-brand.

## Estado en Claude Design

- **projectId**: `5e16fce1-3dfc-49ab-abef-f59dc6d9ab6c` (proyecto "HugoBox")
- Contenido subido (11 archivos):
  - `foundations/`: colors, typography, spacing-radius
  - `components/`: caja-card, buttons, chips-tabs-inputs
  - `screens/`: dashboard, login, historial, nueva-transaccion
  - `guidelines/`: overview (marca, semántica de color, composición)
- Bundle local de las previews: se generó en el scratchpad de la sesión (no versionado). Regenerable desde `src/theme.ts` y las pantallas.

## Si se quiere el flujo de alta fidelidad (componentes RN reales)

Requeriría montar `react-native-web`, un build web bundlable de los componentes y verificación de render — trabajo considerable e incierto (RNW no siempre replica el aspecto nativo). Evaluar solo si la referencia visual actual resulta insuficiente.
