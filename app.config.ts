import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'CargoLink',
  slug: 'cargolink',
  scheme: 'cargolink',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.cargolink.app',
    supportsTablet: false,
  },
  android: {
    package: 'com.cargolink.app',
  },
  plugins: [
    // expo-dev-client is what makes this a bare/dev-client build instead of
    // a managed Expo Go app — required because background GPS tracking
    // (a later task) needs native modules that Expo Go can't load.
    'expo-dev-client',
  ],
  extra: {
    // Backend base URL / env wiring lands here once the OpenAPI contract
    // (freezes Week 2) and env variable strategy are finalized. Not needed
    // for this task — no network calls happen here.
  },
});
