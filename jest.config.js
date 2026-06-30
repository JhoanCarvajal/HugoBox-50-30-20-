module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo|expo-router|firebase|@firebase|@react-native-google-signin)',
  ],
  // @firebase/util incluye un postinstall.mjs (sintaxis ESM nativa) que el preset de
  // jest-expo no transforma por defecto (su regex de transform solo cubre .js/.jsx/.ts/.tsx).
  // Sin esto, requerir 'firebase/auth' bajo Jest revienta con "Unexpected token 'export'".
  transform: {
    '\\.mjs$': ['babel-jest', { plugins: ['@babel/plugin-transform-modules-commonjs'], configFile: false, babelrc: false }],
  },
};
