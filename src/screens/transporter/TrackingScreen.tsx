import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Mapbox from '@rnmapbox/maps';

import type { TransporterStackParamList } from '../../navigation/types';
import { getTrackingHistory, isGetTrackingHistoryError } from '../../api/tracking';
import * as sockets from '../../services/sockets';
import {
  useTrackingStore,
  useTrackingPosition,
  useTrackingConnectionState,
  useTrackingLastUpdatedAt,
} from '../../state/trackingStore';
import { MapMarker } from '../../components/MapMarker';
import { getLastSeenLabel } from '../../utils/formatters';
import type { LatLng } from '../../state/types';

type Props = NativeStackScreenProps<TransporterStackParamList, 'Tracking'>;

function toLatLng(point: { lat: number; lng: number }): LatLng {
  return { latitude: point.lat, longitude: point.lng };
}

/**
 * TrackingScreen (transporter variant) — Task E.1.
 *
 * Shows the transporter's own live position. In production this is fed by
 * Task E.2's background-location task (the transporter's device IS the
 * source of the location, not a subscriber to someone else's); per the
 * Sprint 4 sprint-plan scope and this task's own Dependencies section,
 * both this screen and E.2 are built against the SAME simulated-route
 * mechanism for now, so this screen subscribes to `sockets.ts` exactly
 * like the shipper variant does. Swapping to a real device GPS feed as
 * E.2 comes online is expected to happen inside `sockets.ts`/E.2, not
 * here — this screen only cares about "what is my current position,"
 * regardless of source.
 *
 * Route-line/pickup-destination context is intentionally NOT drawn here:
 * no data source yet exists on the transporter's session for an accepted
 * load's source/destination coordinates (loadStore, as it stands, is
 * shipper-only state on the shipper's device — a real multi-account
 * backend hasn't been wired up yet). Flagged as a forward-looking
 * integration gap rather than guessed at, per the task's own allowance
 * for TBD transporter-side data sourcing.
 */
export default function TrackingScreen({ route }: Props) {
  const { loadId, vehicleId } = route.params;

  const currentPosition = useTrackingPosition();
  const connectionState = useTrackingConnectionState();
  const lastUpdatedAt = useTrackingLastUpdatedAt();
  const updatePosition = useTrackingStore((s) => s.updatePosition);
  const setConnectionState = useTrackingStore((s) => s.setConnectionState);
  const reset = useTrackingStore((s) => s.reset);

  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [, forceTick] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const history = await getTrackingHistory(vehicleId);
        if (cancelled || history.length === 0) return;
        const last = history[history.length - 1];
        updatePosition(toLatLng(last), last.timestamp);
      } catch (err) {
        if (cancelled) return;
        setHistoryError(
          isGetTrackingHistoryError(err) ? err.message : 'Could not load recent history.'
        );
      }
    })();

    const unsubscribeLocation = sockets.onLocationUpdate((payload) => {
      updatePosition(toLatLng(payload), payload.ts);
    });
    const unsubscribeConnection = sockets.onConnectionStateChange((state) => {
      setConnectionState(state);
    });

    sockets.joinRoom(loadId);

    return () => {
      cancelled = true;
      unsubscribeLocation();
      unsubscribeConnection();
      sockets.leaveRoom();
      reset();
    };
    // See the shipper variant's identical comment: no AppState-driven
    // resubscribe effect by design — this singleton subscription survives
    // backgrounding without needing one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, vehicleId]);

  React.useEffect(() => {
    const interval = setInterval(() => forceTick(), 60_000);
    return () => clearInterval(interval);
  }, []);

  const statusLabel = React.useMemo(() => {
    switch (connectionState) {
      case 'live':
        return 'Live';
      case 'reconnecting':
        return 'Reconnecting…';
      case 'lost':
        return getLastSeenLabel(lastUpdatedAt);
      case 'connecting':
      default:
        return 'Connecting…';
    }
  }, [connectionState, lastUpdatedAt]);

  const handleCheckpointQuickAccess = () => {
    // Navigation entry point only, per the task's explicit scope — the
    // real CheckpointTimelineScreen destination is Cluster F's build, not
    // this task's. A placeholder confirms the affordance is reachable and
    // wired without navigating to a route that doesn't exist yet.
    Alert.alert('Checkpoint updates', 'Checkpoint status updates ship in Cluster F.');
  };

  return (
    <View style={styles.container} testID="transporter-tracking-screen">
      <View style={styles.mapContainer} testID="tracking-map-container">
        {!currentPosition ? (
          <View style={styles.mapSkeleton} testID="tracking-map-skeleton">
            <ActivityIndicator color="#0B5FCC" />
          </View>
        ) : (
          <Mapbox.MapView style={styles.map} testID="tracking-map">
            <Mapbox.Camera
              centerCoordinate={[currentPosition.longitude, currentPosition.latitude]}
              zoomLevel={11}
              animationMode="flyTo"
              animationDuration={800}
            />
            <MapMarker position={currentPosition} accessibilityLabel="Your current location" />
          </Mapbox.MapView>
        )}
      </View>

      <View style={styles.statusStrip} testID="tracking-status-strip">
        {connectionState === 'reconnecting' && (
          <ActivityIndicator size="small" color="#8A6D00" style={styles.statusSpinner} />
        )}
        <View
          style={[
            styles.statusDot,
            connectionState === 'live' && styles.statusDotLive,
            connectionState === 'reconnecting' && styles.statusDotReconnecting,
            connectionState === 'lost' && styles.statusDotLost,
          ]}
        />
        <Text
          style={styles.statusText}
          testID="tracking-status-text"
          accessibilityLabel={`Connection status: ${statusLabel}`}
        >
          {statusLabel}
        </Text>
      </View>

      {historyError && (
        <Text style={styles.historyErrorText} testID="tracking-history-error">
          {historyError}
        </Text>
      )}

      <Pressable
        style={styles.checkpointButton}
        onPress={handleCheckpointQuickAccess}
        accessibilityRole="button"
        testID="tracking-checkpoint-quick-access"
      >
        <Text style={styles.checkpointButtonLabel}>Update checkpoint status</Text>
      </Pressable>

      <Text style={styles.loadIdText} testID="tracking-load-id">
        Load ID: {loadId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapSkeleton: {
    flex: 1,
    backgroundColor: '#EDEFF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDEFF2',
  },
  statusSpinner: { marginRight: 8 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9AA1AC',
    marginRight: 8,
  },
  statusDotLive: { backgroundColor: '#1B7A34' },
  statusDotReconnecting: { backgroundColor: '#8A6D00' },
  statusDotLost: { backgroundColor: '#B3261E' },
  statusText: { fontSize: 13, fontWeight: '600', color: '#1A1D21' },
  historyErrorText: {
    fontSize: 12,
    color: '#5B6270',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  checkpointButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkpointButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  loadIdText: {
    fontSize: 11,
    color: '#9AA1AC',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
