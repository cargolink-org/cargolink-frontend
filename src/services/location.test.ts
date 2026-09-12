import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import * as location from './location';
import * as sockets from './sockets';
import * as trackingApi from '../api/tracking';
import { useAuthStore } from '../state/authStore';

jest.mock('expo-location');
jest.mock('expo-task-manager');
jest.mock('./sockets');
jest.mock('../api/tracking');

const mockLocation = Location as jest.Mocked<typeof Location>;
const mockTaskManager = TaskManager as jest.Mocked<typeof TaskManager>;
const mockSockets = sockets as jest.Mocked<typeof sockets>;
const mockTrackingApi = trackingApi as jest.Mocked<typeof trackingApi>;

const GRANTED = { granted: true, status: 'granted', canAskAgain: true, expires: 'never' };
const DENIED = { granted: false, status: 'denied', canAskAgain: true, expires: 'never' };

/**
 * `TaskManager.defineTask` runs once, at `location.ts`'s module-load time
 * (before any `describe`/`it` executes) — so the executor is captured
 * here, at file scope, rather than inside a `beforeEach`. Invoking it
 * directly simulates what a real background GPS delivery from the OS
 * would look like, without needing a native TaskManager bridge.
 */
const taskExecutor = (mockTaskManager.defineTask as jest.Mock).mock.calls[0][1] as (body: {
  data?: { locations?: Location.LocationObject[] };
  error?: unknown;
}) => void;

/**
 * Same reasoning as `taskExecutor` above: `sockets.onConnectionStateChange`
 * is also called exactly once, at `location.ts`'s module-load time, to
 * register the auto-flush-on-reconnect listener — captured here, before
 * any `beforeEach`'s `jest.clearAllMocks()` would otherwise wipe that
 * one-time call out of `.mock.calls`.
 */
const connectionListener = (mockSockets.onConnectionStateChange as jest.Mock).mock.calls[0][0] as (
  state: string
) => void;

function makeLocationObject(lat: number, lng: number, timestamp = Date.now()): Location.LocationObject {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp,
  } as unknown as Location.LocationObject;
}

function resetAuthStore(overrides: Partial<ReturnType<typeof useAuthStore.getState>> = {}) {
  useAuthStore.setState({
    token: 'token-a',
    refreshToken: 'refresh-a',
    user: { id: 'u1', phone: '9999999999', role: 'transporter' },
    role: 'transporter',
    isNewUser: false,
    isAuthenticated: true,
    isHydrated: true,
    logoutReason: null,
    ...overrides,
  });
}

async function flushMicrotasks(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

const TRIP = { loadId: 'load-1', vehicleId: 'veh-1' };

describe('location.ts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    location.__resetForTests();
    resetAuthStore();

    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(GRANTED);
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue(GRANTED);
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue(GRANTED);
    (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue(GRANTED);
    mockLocation.startLocationUpdatesAsync.mockResolvedValue(undefined);
    mockLocation.stopLocationUpdatesAsync.mockResolvedValue(undefined);
    mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValue(true);

    mockSockets.getConnectionState.mockReturnValue('live');
    mockSockets.emitLocationUpdate.mockReturnValue(true);
    mockSockets.joinRoom.mockImplementation(() => undefined);
    mockSockets.leaveRoom.mockImplementation(() => undefined);

    mockTrackingApi.postTrackingPingBatch.mockResolvedValue({ acknowledged: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getTrackingStatus', () => {
    it('reports an idle state before any trip starts', () => {
      expect(location.getTrackingStatus()).toEqual({
        isTracking: false,
        loadId: null,
        vehicleId: null,
        lastEmittedAt: null,
        bufferedCount: 0,
        permissionRevoked: false,
      });
    });
  });

  describe('startBackgroundTracking / stopBackgroundTracking', () => {
    it('starts tracking, joins the room, and starts the native location task at the throttle interval', async () => {
      const result = await location.startBackgroundTracking(TRIP);

      expect(result).toEqual({ started: true, backgroundGranted: true });
      expect(mockSockets.joinRoom).toHaveBeenCalledWith('load-1');
      expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
        'cargolink-background-location-task',
        expect.objectContaining({ timeInterval: location.LOCATION_EMIT_INTERVAL_MS })
      );
      expect(location.getTrackingStatus()).toMatchObject({
        isTracking: true,
        loadId: 'load-1',
        vehicleId: 'veh-1',
      });
    });

    it('the throttle interval stays within the spec-mandated 5–10s band', () => {
      expect(location.LOCATION_EMIT_INTERVAL_MS).toBeGreaterThanOrEqual(5000);
      expect(location.LOCATION_EMIT_INTERVAL_MS).toBeLessThanOrEqual(10000);
    });

    it('returns already_tracking on a second start call, without restarting the native task', async () => {
      await location.startBackgroundTracking(TRIP);
      mockLocation.startLocationUpdatesAsync.mockClear();

      const result = await location.startBackgroundTracking({ loadId: 'load-2', vehicleId: 'veh-2' });

      expect(result).toEqual({ started: false, reason: 'already_tracking' });
      expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    it('does not start when foreground permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(DENIED);

      const result = await location.startBackgroundTracking(TRIP);

      expect(result).toEqual({ started: false, reason: 'permission_denied' });
      expect(mockSockets.joinRoom).not.toHaveBeenCalled();
      expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
      expect(location.getTrackingStatus().isTracking).toBe(false);
    });

    it('proceeds on foreground-only permission, reporting backgroundGranted: false', async () => {
      (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue(DENIED);

      const result = await location.startBackgroundTracking(TRIP);

      expect(result).toEqual({ started: true, backgroundGranted: false });
      expect(location.getTrackingStatus().isTracking).toBe(true);
    });

    it('rolls back to a clean state if the native start call itself throws', async () => {
      mockLocation.startLocationUpdatesAsync.mockRejectedValue(new Error('native failure'));

      await expect(location.startBackgroundTracking(TRIP)).rejects.toThrow('native failure');

      expect(location.getTrackingStatus().isTracking).toBe(false);
      expect(mockSockets.leaveRoom).toHaveBeenCalled();
    });

    it('stops tracking: unregisters the native task, leaves the room, and clears trip state', async () => {
      await location.startBackgroundTracking(TRIP);

      await location.stopBackgroundTracking();

      expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith('cargolink-background-location-task');
      expect(mockSockets.leaveRoom).toHaveBeenCalled();
      expect(location.getTrackingStatus()).toMatchObject({
        isTracking: false,
        loadId: null,
        vehicleId: null,
        bufferedCount: 0,
      });
    });

    it('is a no-op when called while not tracking', async () => {
      await location.stopBackgroundTracking();

      expect(mockLocation.stopLocationUpdatesAsync).not.toHaveBeenCalled();
      expect(mockSockets.leaveRoom).not.toHaveBeenCalled();
    });
  });

  describe('emission throttling (via the registered TaskManager task)', () => {
    beforeEach(async () => {
      await location.startBackgroundTracking(TRIP);
      mockSockets.emitLocationUpdate.mockClear();
    });

    it('emits the first sample immediately, with the correct payload shape', () => {
      taskExecutor({ data: { locations: [makeLocationObject(12.9, 77.6)] } });

      expect(mockSockets.emitLocationUpdate).toHaveBeenCalledTimes(1);
      expect(mockSockets.emitLocationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ load_id: 'load-1', vehicle_id: 'veh-1', lat: 12.9, lng: 77.6 })
      );
    });

    it('throttles a second sample arriving before the interval has elapsed', () => {
      taskExecutor({ data: { locations: [makeLocationObject(12.9, 77.6)] } });
      taskExecutor({ data: { locations: [makeLocationObject(12.91, 77.61)] } });

      expect(mockSockets.emitLocationUpdate).toHaveBeenCalledTimes(1);
    });

    it('emits again once the throttle interval has elapsed, staying within the 5–10s cadence', () => {
      taskExecutor({ data: { locations: [makeLocationObject(12.9, 77.6)] } });
      jest.advanceTimersByTime(location.LOCATION_EMIT_INTERVAL_MS + 100);
      taskExecutor({ data: { locations: [makeLocationObject(12.91, 77.61)] } });

      expect(mockSockets.emitLocationUpdate).toHaveBeenCalledTimes(2);
    });

    it('discards (0,0) and out-of-range coordinates before ever emitting', () => {
      taskExecutor({ data: { locations: [makeLocationObject(0, 0)] } });
      taskExecutor({ data: { locations: [makeLocationObject(200, 77.6)] } });
      taskExecutor({ data: { locations: [makeLocationObject(12.9, 999)] } });
      taskExecutor({ data: { locations: [makeLocationObject(Number.NaN, 77.6)] } });

      expect(mockSockets.emitLocationUpdate).not.toHaveBeenCalled();
    });

    it('ignores task deliveries once tracking has stopped', async () => {
      await location.stopBackgroundTracking();

      taskExecutor({ data: { locations: [makeLocationObject(12.9, 77.6)] } });

      expect(mockSockets.emitLocationUpdate).not.toHaveBeenCalled();
    });

    it('ignores an empty locations array without throwing', () => {
      expect(() => taskExecutor({ data: { locations: [] } })).not.toThrow();
      expect(mockSockets.emitLocationUpdate).not.toHaveBeenCalled();
    });
  });

  describe('buffering when the socket is unavailable', () => {
    beforeEach(async () => {
      await location.startBackgroundTracking(TRIP);
      mockSockets.emitLocationUpdate.mockClear();
    });

    it('buffers a sample when the connection is not live, without calling emitLocationUpdate', () => {
      mockSockets.getConnectionState.mockReturnValue('reconnecting');

      taskExecutor({ data: { locations: [makeLocationObject(12.9, 77.6)] } });

      expect(mockSockets.emitLocationUpdate).not.toHaveBeenCalled();
      expect(location.getTrackingStatus().bufferedCount).toBe(1);
    });

    it('buffers a sample when emitLocationUpdate itself reports failure despite a live state', () => {
      mockSockets.getConnectionState.mockReturnValue('live');
      mockSockets.emitLocationUpdate.mockReturnValue(false);

      taskExecutor({ data: { locations: [makeLocationObject(12.9, 77.6)] } });

      expect(location.getTrackingStatus().bufferedCount).toBe(1);
    });

    it('flushes the buffer over the socket once the connection reports live again', () => {
      mockSockets.getConnectionState.mockReturnValue('reconnecting');
      taskExecutor({ data: { locations: [makeLocationObject(12.9, 77.6)] } });
      expect(location.getTrackingStatus().bufferedCount).toBe(1);

      mockSockets.getConnectionState.mockReturnValue('live');
      mockSockets.emitLocationUpdate.mockReturnValue(true);
      connectionListener('live');

      expect(mockSockets.emitLocationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ lat: 12.9, lng: 77.6 })
      );
      expect(location.getTrackingStatus().bufferedCount).toBe(0);
    });

    it('re-buffers a ping that fails again during a flush attempt, rather than dropping it', () => {
      mockSockets.getConnectionState.mockReturnValue('reconnecting');
      taskExecutor({ data: { locations: [makeLocationObject(12.9, 77.6)] } });

      mockSockets.emitLocationUpdate.mockReturnValue(false); // still failing
      connectionListener('live');

      expect(location.getTrackingStatus().bufferedCount).toBe(1);
    });

    it('a reconnect while not tracking does not attempt a flush', () => {
      location.__resetForTests(); // isTracking: false, buffer empty
      mockSockets.emitLocationUpdate.mockClear();

      connectionListener('live');

      expect(mockSockets.emitLocationUpdate).not.toHaveBeenCalled();
    });
  });

  describe('REST fallback when the buffer is over capacity', () => {
    beforeEach(async () => {
      await location.startBackgroundTracking(TRIP);
      mockSockets.getConnectionState.mockReturnValue('reconnecting');
    });

    function bufferSamples(count: number): void {
      for (let i = 0; i < count; i += 1) {
        taskExecutor({ data: { locations: [makeLocationObject(10 + i * 0.001, 70 + i * 0.001)] } });
        jest.advanceTimersByTime(location.LOCATION_EMIT_INTERVAL_MS + 10);
      }
    }

    it('attempts a REST flush once the buffer exceeds capacity, and clears it on success', async () => {
      mockTrackingApi.postTrackingPingBatch.mockResolvedValue({ acknowledged: true });

      bufferSamples(21); // capacity is 20
      await flushMicrotasks();

      expect(mockTrackingApi.postTrackingPingBatch).toHaveBeenCalled();
      expect(location.getTrackingStatus().bufferedCount).toBe(0);
    });

    it('only drops the oldest pings down to capacity after a failed REST attempt — never before trying', async () => {
      mockTrackingApi.postTrackingPingBatch.mockResolvedValue({ acknowledged: false });

      bufferSamples(21);
      await flushMicrotasks();

      expect(mockTrackingApi.postTrackingPingBatch).toHaveBeenCalled();
      expect(location.getTrackingStatus().bufferedCount).toBe(20);
    });
  });

  describe('permission-revoked mid-trip detection', () => {
    it('notifies listeners and sets permissionRevoked when a poll finds permission no longer granted', async () => {
      await location.startBackgroundTracking(TRIP);
      const listener = jest.fn();
      location.onPermissionRevokedChange(listener);

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue(DENIED);
      jest.advanceTimersByTime(60_000);
      await flushMicrotasks();

      expect(listener).toHaveBeenCalledWith(true);
      expect(location.getTrackingStatus().permissionRevoked).toBe(true);
    });

    it('does not end the trip when permission is revoked — isTracking stays true', async () => {
      await location.startBackgroundTracking(TRIP);

      (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue(DENIED);
      jest.advanceTimersByTime(60_000);
      await flushMicrotasks();

      expect(location.getTrackingStatus()).toMatchObject({ isTracking: true, permissionRevoked: true });
    });

    it('clears the warning if a later poll finds permission re-granted', async () => {
      await location.startBackgroundTracking(TRIP);
      const listener = jest.fn();
      location.onPermissionRevokedChange(listener);

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue(DENIED);
      jest.advanceTimersByTime(60_000);
      await flushMicrotasks();
      expect(location.getTrackingStatus().permissionRevoked).toBe(true);

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue(GRANTED);
      jest.advanceTimersByTime(60_000);
      await flushMicrotasks();

      expect(listener).toHaveBeenLastCalledWith(false);
      expect(location.getTrackingStatus().permissionRevoked).toBe(false);
    });

    it('surfaces permission-revoked via the TaskManager error callback too', async () => {
      await location.startBackgroundTracking(TRIP);
      const listener = jest.fn();
      location.onPermissionRevokedChange(listener);

      taskExecutor({ error: { message: 'permission revoked' } });

      expect(listener).toHaveBeenCalledWith(true);
      expect(location.getTrackingStatus().permissionRevoked).toBe(true);
    });

    it('clears permissionRevoked on stopBackgroundTracking', async () => {
      await location.startBackgroundTracking(TRIP);
      taskExecutor({ error: { message: 'x' } });
      expect(location.getTrackingStatus().permissionRevoked).toBe(true);

      await location.stopBackgroundTracking();

      expect(location.getTrackingStatus().permissionRevoked).toBe(false);
    });
  });

  describe('requestTrackingPermissions', () => {
    it('requests background permission only after foreground is granted', async () => {
      const result = await location.requestTrackingPermissions();

      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.requestBackgroundPermissionsAsync).toHaveBeenCalled();
      expect(result).toEqual({ foregroundGranted: true, backgroundGranted: true });
    });

    it('does not request background permission when foreground is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(DENIED);

      const result = await location.requestTrackingPermissions();

      expect(mockLocation.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
      expect(result).toEqual({ foregroundGranted: false, backgroundGranted: false });
    });
  });

  describe('logout', () => {
    it('stops tracking automatically when the user logs out mid-trip', async () => {
      await location.startBackgroundTracking(TRIP);
      expect(location.getTrackingStatus().isTracking).toBe(true);

      resetAuthStore({ isAuthenticated: false });
      await flushMicrotasks();

      expect(mockSockets.leaveRoom).toHaveBeenCalled();
      expect(location.getTrackingStatus().isTracking).toBe(false);
    });

    it('does nothing on a logout transition when no trip is active', async () => {
      resetAuthStore({ isAuthenticated: false });
      await flushMicrotasks();

      expect(mockSockets.leaveRoom).not.toHaveBeenCalled();
    });
  });
});
