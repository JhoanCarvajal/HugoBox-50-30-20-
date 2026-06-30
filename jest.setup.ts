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
