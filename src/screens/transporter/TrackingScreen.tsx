import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Mapbox from '@rnmapbox/maps';

import type { TransporterStackParamList } from '../../navigation/types';
import { getTrackingHistory, isGetTrackingHistoryError } from '../../api/tracking';
import * as sockets from '../../services/sockets';
import * as location from '../../services/location';
import {
  useTrackingStore,
  useTrackingPosition,
  useTrackingConnectionState,
  useTrackingLastUpdatedAt,
} from '../../state/trackingStore';
import { MapMarker } from '../../components/MapMarker';
import { LocationPermissionPrompt, type LocationPermissionPromptStep } from '../../components/LocationPermissionPrompt';
import { getLastSeenLabel } from '../../utils/formatters';
import type { LatLng } from '../../state/types';

type Props = NativeStackScreenProps<TransporterStackParamList, 'Tracking'>;

function toLatLng(point: { lat: number; lng: number }): LatLng {
  return { latitude: point.lat, longitude: point.lng };
}

/**
 * TrackingScreen (transporter variant) — Task E.1, extended by Task E.2.
 *
 * Shows the transporter's own live position. The position feed itself is
 * unchanged from E.1: this screen subscribes to `sockets.ts`'s
 * `onLocationUpdate`/`onConnectionStateChange`, the same as the shipper
 * variant — it only cares about "what is my current position," not where
 * it came from. What Task E.2 adds is the SOURCE side: "Start Trip" now
 * starts `location.ts`'s real background GPS task (device location,
 * throttled 5–10s), which emits back into this same connection via
 * `sockets.ts`'s `emitLocationUpdate`. Per Sprint 4 scope, the
 * TRANSMISSION TARGET is still mocked (see `sockets.ts`'s
 * `emitLocationUpdate` doc comment) — the GPS acquisition above it is
 * real.
 *
 * Connection-ownership note (Task E.2): once a trip is started,
 * `location.ts` owns keeping the underlying room/connection alive
 * independent of whether THIS screen is mounted (background task must
 * survive navigation/backgrounding). This screen's unmount cleanup below
 * only calls `sockets.leaveRoom()` when no trip is actively tracking —
 * otherwise it would tear down the very connection the background task
 * depends on. See the matching comment in `location.ts`'s top-of-file
 * doc.
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

  // Task E.2 — trip lifecycle state. `isTripTracking` mirrors
  // `location.getTrackingStatus().isTracking` in React state so the
  // Start/End Trip button re-renders correctly; it's re-synced from
  // `location.ts` (the source of truth) rather than assumed, since a
  // background task's real status can change from outside a button press
  // (e.g. permission loss doesn't end the trip, but a crash-recovery
  // remount should still reflect whatever `location.ts` currently says).
  const [isTripTracking, setIsTripTracking] = React.useState(() => location.getTrackingStatus().isTracking);
  const [isStartingTrip, setIsStartingTrip] = React.useState(false);
  const [permissionRevoked, setPermissionRevoked] = React.useState(
    () => location.getTrackingStatus().permissionRevoked
  );
  const [promptVisible, setPromptVisible] = React.useState(false);
  const [promptStep, setPromptStep] = React.useState<LocationPermissionPromptStep>('primer');

  React.useEffect(() => {
    return location.onPermissionRevokedChange(setPermissionRevoked);
  }, []);

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
      // Task E.2: a trip started via "Start Trip" owns this connection
      // independent of this screen's mount state — only tear the room
      // down here if no trip is actively tracking; otherwise leaving
      // this screen (backgrounding the app, navigating to Checkpoints,
      // etc.) would kill the very connection the background task
      // depends on. See this file's top comment and location.ts's.
      if (!location.getTrackingStatus().isTracking) {
        sockets.leaveRoom();
      }
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

  // Task E.2 — "Start Trip" shows the permission primer first (UI
  // Requirements: explain WHY before the OS dialog fires), rather than
  // requesting permission directly.
  const handleStartTripPress = () => {
    setPromptStep('primer');
    setPromptVisible(true);
  };

  const handlePromptContinue = async () => {
    setIsStartingTrip(true);
    try {
      const result = await location.startBackgroundTracking({ loadId, vehicleId });
      if (result.started) {
        setPromptVisible(false);
        setIsTripTracking(true);
        if (result.backgroundGranted === false) {
          // Foreground-only permission: proceed, but be upfront that
          // updates will pause once backgrounded (edge case from the
          // task spec — not a hard blocker, but must not be silent).
          Alert.alert(
            'Background tracking limited',
            'Live tracking will pause while the app is backgrounded, until background location is enabled in Settings.'
          );
        }
      } else if (result.reason === 'permission_denied') {
        setPromptStep('denied');
      } else {
        // already_tracking — a trip is already running (e.g. resumed
        // after a remount); reflect that rather than re-prompting.
        setPromptVisible(false);
        setIsTripTracking(true);
      }
    } catch {
      setPromptVisible(false);
      Alert.alert('Could not start trip', 'Something went wrong starting live tracking. Please try again.');
    } finally {
      setIsStartingTrip(false);
    }
  };

  const handlePromptDismiss = () => {
    setPromptVisible(false);
  };

  const handleEndTripPress = async () => {
    await location.stopBackgroundTracking();
    setIsTripTracking(false);
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

      {permissionRevoked && (
        <View
          style={styles.permissionWarningBanner}
          accessibilityRole="alert"
          testID="tracking-permission-revoked-banner"
        >
          <Text style={styles.permissionWarningText}>
            Location access was turned off — the shipper can no longer see your live position.
          </Text>
        </View>
      )}

      <Pressable
        style={[styles.tripButton, isTripTracking ? styles.tripButtonEnd : styles.tripButtonStart]}
        onPress={isTripTracking ? handleEndTripPress : handleStartTripPress}
        disabled={isStartingTrip}
        accessibilityRole="button"
        accessibilityState={{ disabled: isStartingTrip }}
        testID={isTripTracking ? 'tracking-end-trip' : 'tracking-start-trip'}
      >
        {isStartingTrip ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.tripButtonLabel}>{isTripTracking ? 'End Trip' : 'Start Trip'}</Text>
        )}
      </Pressable>

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

      <LocationPermissionPrompt
        visible={promptVisible}
        step={promptStep}
        onContinue={handlePromptContinue}
        onDismiss={handlePromptDismiss}
      />
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
  permissionWarningBanner: {
    backgroundColor: '#FCEBEA',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionWarningText: { fontSize: 12, color: '#B3261E', fontWeight: '600' },
  tripButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tripButtonStart: { backgroundColor: '#1B7A34' },
  tripButtonEnd: { backgroundColor: '#B3261E' },
  tripButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
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
