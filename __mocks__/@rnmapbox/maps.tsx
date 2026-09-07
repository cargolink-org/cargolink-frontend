/**
 * Jest manual mock for `@rnmapbox/maps` (Task E.1).
 *
 * Automatically picked up by Jest for every test file that imports
 * `@rnmapbox/maps` — it's a node_modules package, so a mock placed at
 * `<rootDir>/__mocks__/@rnmapbox/maps.tsx` is applied automatically with
 * no per-test `jest.mock('@rnmapbox/maps')` call needed (Jest's
 * documented convention for scoped-package node_modules mocks).
 *
 * Real native map rendering can't run in the Jest test environment
 * regardless of whether the package is installed, so every export here is
 * a plain `View` passthrough that preserves `testID`/children for
 * assertions, not a functional map — screens/tests should assert on
 * testIDs and store state, never on actual map rendering.
 */
import React from 'react';
import { View } from 'react-native';

interface MapViewProps {
  children?: React.ReactNode;
  testID?: string;
  style?: unknown;
}

function MapView({ children, testID, style }: MapViewProps) {
  return (
    <View testID={testID ?? 'mapbox-map-view'} style={style as never}>
      {children}
    </View>
  );
}

interface CameraProps {
  testID?: string;
  centerCoordinate?: [number, number];
  zoomLevel?: number;
}

function Camera({ testID, centerCoordinate }: CameraProps) {
  return (
    <View
      testID={testID ?? 'mapbox-camera'}
      accessibilityValue={centerCoordinate ? { text: JSON.stringify(centerCoordinate) } : undefined}
    />
  );
}

interface MarkerViewProps {
  children?: React.ReactNode;
  testID?: string;
  coordinate?: [number, number];
}

function MarkerView({ children, testID, coordinate }: MarkerViewProps) {
  return (
    <View
      testID={testID ?? 'mapbox-marker-view'}
      accessibilityValue={coordinate ? { text: JSON.stringify(coordinate) } : undefined}
    >
      {children}
    </View>
  );
}

function PointAnnotation({ children, testID }: { children?: React.ReactNode; testID?: string }) {
  return <View testID={testID ?? 'mapbox-point-annotation'}>{children}</View>;
}

const setAccessToken = jest.fn();

const Mapbox = {
  MapView,
  Camera,
  MarkerView,
  PointAnnotation,
  setAccessToken,
  StyleURL: { Street: 'mapbox://styles/mapbox/streets-v12' },
};

export default Mapbox;
