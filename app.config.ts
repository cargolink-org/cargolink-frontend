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
    //
    // Mapbox public access token (task D.1) — consumed by
    // `LocationPicker`'s address-search geocoding calls via
    // `api/geocoding.ts`. Public/client-side tokens are Mapbox's standard
    // usage model (not a secret), but it's still sourced from env wiring
    // here rather than hardcoded inline. Actual runtime reads happen via
    // `process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` directly (same
    // EXPO_PUBLIC_* convention already used for EXPO_PUBLIC_API_URL and
    // EXPO_PUBLIC_MOCK_MODE in src/api/client.ts) — this `extra` entry
    // exists so the same value is also reachable via `expo-constants` for
    // any native config plugin (e.g. Cluster E's `@rnmapbox/maps`) that
    // needs it at build time rather than at JS runtime.
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
  },
});
