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
    // @rnmapbox/maps (task E.1) — the NATIVE map binding used by the live
    // tracking screens, distinct from D.1's REST-only geocoding usage.
    // First task to actually exercise this native module; a native
    // rebuild (`expo prebuild` / `expo run:ios` / `expo run:android`) is
    // required after installing/configuring it — plain Metro reload is
    // not sufficient, since this links native iOS/Android code.
    [
      '@rnmapbox/maps',
      {
        // Mapbox's SDK *download* token — distinct from the public
        // runtime access token in `extra.mapboxAccessToken` below.
        // Required at BUILD time to pull the native Mapbox SDK; get it
        // from a Mapbox account token with the "Downloads:Read" scope
        // (see @rnmapbox/maps' install docs). Deliberately NOT prefixed
        // `EXPO_PUBLIC_` — it must never ship in the client bundle, only
        // read by this config-plugin step, so it's sourced from the
        // build/CI environment instead.
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN ?? '',
      },
    ],
    // expo-location (Task E.2) — background GPS streaming for the
    // transporter role. `isIosBackgroundLocationEnabled` adds the
    // `location` UIBackgroundModes entry to Info.plist;
    // `isAndroidBackgroundLocationEnabled` adds
    // ACCESS_BACKGROUND_LOCATION (and, since
    // `isAndroidForegroundServiceEnabled` is left unset, defaults ON
    // too — see the plugin's own default-inheritance behavior — adding
    // FOREGROUND_SERVICE + FOREGROUND_SERVICE_LOCATION, both required
    // for the persistent notification `location.ts`'s
    // `startLocationUpdatesAsync({ foregroundService: {...} })` call
    // shows on Android 8+ while a trip is active).
    //
    // The permission COPY here intentionally matches
    // `LocationPermissionPrompt`'s in-app primer's rationale — a
    // consistent story between the primer shown before this dialog and
    // the OS dialog's own text, rather than two different explanations.
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'CargoLink uses your location so shippers can see your delivery progress in real time while a trip is active. Location is never streamed outside of an active trip.',
        locationWhenInUsePermission:
          'CargoLink uses your location so shippers can see your delivery progress in real time while a trip is active.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
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
