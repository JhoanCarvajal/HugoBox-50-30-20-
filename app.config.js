// Configuración de Expo en formato JS para poder resolver el archivo
// google-services.json desde una variable de entorno de EAS (file env var).
//
// - En local: usa "./google-services.json" (git-ignorado, presente en tu máquina).
// - En EAS Build: process.env.GOOGLE_SERVICES_JSON apunta a la ruta del archivo
//   secreto que EAS descarga en el builder (ver eas env:create más abajo).
export default {
  expo: {
    name: "HugoBox",
    slug: "hugobox",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "hugobox",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.hugobox.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-router", "@react-native-google-signin/google-signin"],
    extra: {
      router: {},
      eas: {
        projectId: "5afc9cbb-cd04-4a47-9cc0-88711b7b72d3",
      },
    },
  },
};
