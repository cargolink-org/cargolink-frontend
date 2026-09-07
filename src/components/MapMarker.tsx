import React from 'react';
import { View, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import type { LatLng } from '../state/types';

// Set once at module load — @rnmapbox/maps requires an access token
// before any map component renders. Both TrackingScreen variants import
// this module (directly or via the map they render), so this is the
// natural single place to guarantee it's set rather than duplicating the
// call in each screen. Same `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` env var
// `api/geocoding.ts` already reads for D.1's REST geocoding calls.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

export interface MapMarkerProps {
  position: LatLng;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Thin wrapper around `@rnmapbox/maps`'s native `MarkerView`.
 *
 * Deliberately NOT `PointAnnotation` — that component has historically
 * needed an explicit imperative `.refresh()` ref call to reflect a
 * changed `coordinate` prop, which would mean re-deriving a ref/effect
 * dance on every 5-10s position tick. `MarkerView` re-positions natively
 * from a prop change alone, which is exactly the "native marker update,
 * not a full component re-render" requirement named as a hard
 * performance constraint for this screen (Task E.1).
 *
 * `React.memo`'d so a parent re-render that doesn't actually change
 * `position` (e.g. an unrelated ETA-badge state update) doesn't force
 * this marker through render + Mapbox's prop-diffing unnecessarily.
 */
function MapMarkerBase({ position, testID = 'map-marker', accessibilityLabel }: MapMarkerProps) {
  return (
    <Mapbox.MarkerView coordinate={[position.longitude, position.latitude]} testID={testID}>
      <View
        style={styles.dot}
        accessibilityLabel={accessibilityLabel ?? 'Vehicle location'}
        accessibilityRole="image"
        testID={`${testID}-dot`}
      />
    </Mapbox.MarkerView>
  );
}

export const MapMarker = React.memo(MapMarkerBase, (prev, next) => {
  return (
    prev.position.latitude === next.position.latitude &&
    prev.position.longitude === next.position.longitude &&
    prev.testID === next.testID &&
    prev.accessibilityLabel === next.accessibilityLabel
  );
});

export default MapMarker;

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0B5FCC',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
