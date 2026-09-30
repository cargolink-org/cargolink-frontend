import React from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Mapbox from '@rnmapbox/maps';

import type { ShipperStackParamList } from '../../navigation/types';
import { getTrackingHistory, isGetTrackingHistoryError } from '../../api/tracking';
import * as sockets from '../../services/sockets';
import {
  useTrackingStore,
  useTrackingPosition,
  useTrackingConnectionState,
  useTrackingLastUpdatedAt,
} from '../../state/trackingStore';
import { MapMarker } from '../../components/MapMarker';
import { EtaBadge } from '../../components/EtaBadge';
import { getLastSeenLabel } from '../../utils/formatters';
import type { LatLng } from '../../state/types';

type Props = NativeStackScreenProps<ShipperStackParamList, 'Tracking'>;

function toLatLng(point: { lat: number; lng: number }): LatLng {
  return { latitude: point.lat, longitude: point.lng };
}

/**
 * TrackingScreen (shipper variant) — Task E.1.
 *
 * Replaces the D.2 placeholder stub. Subscribes to the accepted load's
 * live position feed via `services/sockets.ts` and renders it on a native
 * Mapbox map, with an ETA badge and an explicit three(+)-state connection
 * indicator — see the Performance/UI sections of the task spec, which
 * name this the highest-risk screen in the frontend track.
 *
 * On backgrounding/foregrounding: this screen deliberately does NOT add a
 * separate `AppState`-driven resubscribe effect. `sockets.ts` is a
 * singleton that keeps running independent of this component's mount
 * state, and this component's own subscriptions are set up exactly once
 * per (loadId, vehicleId) pair and torn down exactly once on unmount —
 * there is no "resubscribe" path that could double-subscribe, because
 * backgrounding the app does not by itself unmount this screen. The named
 * failure mode (duplicate listeners across mount/unmount cycles) is
 * covered by the mount -> unmount -> remount test in
 * `TrackingScreen.test.tsx` instead.
 */
export default function TrackingScreen({ route, navigation }: Props) {
  const { loadId, vehicleId, eta } = route.params;

  const currentPosition = useTrackingPosition();
  const connectionState = useTrackingConnectionState();
  const lastUpdatedAt = useTrackingLastUpdatedAt();
  const updatePosition = useTrackingStore((s) => s.updatePosition);
  const setConnectionState = useTrackingStore((s) => s.setConnectionState);
  const reset = useTrackingStore((s) => s.reset);

  const [historyError, setHistoryError] = React.useState<string | null>(null);
  // Re-renders once a minute purely to keep the "Last seen X min ago"
  // label current while no new pings are arriving — a stale timestamp
  // doesn't otherwise trigger a re-render on its own.
  const [, forceTick] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    let cancelled = false;

    // Historical/initial load — non-blocking per the task's edge case: a
    // failure here must not prevent the live socket stream from working,
    // so the error is captured locally and the map still mounts once the
    // first live update arrives.
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
    // Re-subscribes only when the load/vehicle pairing actually changes,
    // matching the convention FareQuoteScreen's fetchQuote effect uses.
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

  // Task F.1 — shipment-details quick-access handlers, mirrored on the
  // transporter variant of this screen. The shipper never sees a
  // checkpoint-UPDATE action (that's transporter-only, gated inside
  // CheckpointTimelineScreen itself) but can still view the timeline.
  const handleDocumentsQuickAccess = () => {
    navigation.navigate('DocumentChecklist', { loadId });
  };

  const handleCheckpointsQuickAccess = () => {
    navigation.navigate('CheckpointTimeline', { loadId });
  };

  const handleContainerQuickAccess = () => {
    navigation.navigate('ContainerDetails', { loadId });
  };

  // Task G.1 — not in that task's own "Files to Modify" list, added here
  // anyway: its "Navigation dependencies" section names this screen as
  // the typical entry point, and every other Cluster F/G shared/role
  // screen so far has been reachable from a real quick-access button here
  // rather than left registered-but-orphaned (see F.1's identical
  // reasoning for wiring Documents/Checkpoints/Container above). `vehicleId`
  // is passed as `rateeId` — see RatingScreen.tsx's top-of-file comment
  // for the ASSUMPTION this rests on.
  const handleRateQuickAccess = () => {
    navigation.navigate('Rating', { loadId, rateeId: vehicleId });
  };

  return (
    <View style={styles.container} testID="shipper-tracking-screen">
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
            <MapMarker position={currentPosition} accessibilityLabel="Transporter's current location" />
          </Mapbox.MapView>
        )}

        <View style={styles.etaOverlay}>
          <EtaBadge etaLabel={eta ?? null} />
        </View>
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

      {/* Task F.1 — shipment-details quick access row. */}
      <View style={styles.shipmentDetailsRow}>
        <Pressable
          style={styles.shipmentDetailsButton}
          onPress={handleDocumentsQuickAccess}
          accessibilityRole="button"
          testID="tracking-documents-quick-access"
        >
          <Text style={styles.shipmentDetailsButtonLabel}>Documents</Text>
        </Pressable>
        <Pressable
          style={styles.shipmentDetailsButton}
          onPress={handleCheckpointsQuickAccess}
          accessibilityRole="button"
          testID="tracking-checkpoints-quick-access"
        >
          <Text style={styles.shipmentDetailsButtonLabel}>Checkpoints</Text>
        </Pressable>
        <Pressable
          style={styles.shipmentDetailsButton}
          onPress={handleContainerQuickAccess}
          accessibilityRole="button"
          testID="tracking-container-quick-access"
        >
          <Text style={styles.shipmentDetailsButtonLabel}>Container</Text>
        </Pressable>
        <Pressable
          style={styles.shipmentDetailsButton}
          onPress={handleRateQuickAccess}
          accessibilityRole="button"
          testID="tracking-rate-quick-access"
        >
          <Text style={styles.shipmentDetailsButtonLabel}>Rate</Text>
        </Pressable>
      </View>

      <Text style={styles.loadIdText} testID="tracking-load-id">
        Load ID: {loadId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapSkeleton: {
    flex: 1,
    backgroundColor: '#EDEFF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaOverlay: { position: 'absolute', top: 16, left: 16 },
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
  shipmentDetailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  shipmentDetailsButton: {
    flex: 1,
    backgroundColor: '#F4F6F9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shipmentDetailsButtonLabel: { color: '#3A4048', fontSize: 13, fontWeight: '600' },
  loadIdText: {
    fontSize: 11,
    color: '#9AA1AC',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
