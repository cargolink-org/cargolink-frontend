/**
 * location.ts
 *
 * Background GPS-streaming service for the transporter role (Task E.2).
 * Starts/stops with an explicit trip state ("Start Trip" / "End Trip" on
 * the transporter's `TrackingScreen`, E.1) — NOT with that screen's
 * mount/unmount lifecycle. Once a trip is started, tracking must survive
 * the transporter backgrounding the app or navigating elsewhere.
 *
 * Library choice (Sprint 1 decision point, made here since it wasn't
 * explicitly locked in during A.2 — see the E.2 task's Context section):
 * Expo `TaskManager` + `expo-location`, not
 * `react-native-background-geolocation`. Both are sanctioned by the
 * technical spec (§2.1); TaskManager+Location was chosen because every
 * other native capability in this app so far (`expo-secure-store`,
 * `expo-document-picker`, `expo-image-picker`) is already an Expo
 * first-party module, keeping the native-dependency surface consistent
 * rather than introducing a second background-task paradigm from a
 * third-party library. Documented here per the task's instruction to
 * record this decision before writing implementation code.
 *
 * Platform-specific gotchas:
 * - The 5–10s emit throttle (`LOCATION_EMIT_INTERVAL_MS`) is the PRIMARY
 *   battery/bridge-traffic mitigation named in the technical spec — do
 *   not tighten it without a specific, documented reason. It is enforced
 *   twice, belt-and-braces: as the native `timeInterval` passed to
 *   `Location.startLocationUpdatesAsync` (so the OS itself throttles
 *   delivery), AND again in `handleLocationSample` below (so nothing in
 *   this module can emit faster even if a platform's native cadence runs
 *   ahead of what was requested).
 * - OS-kill: a background task cannot survive the OS fully killing the
 *   app process. This is a known, unavoidable platform limitation, not a
 *   bug to fix here — documented in `frontend/README.md`'s "Known
 *   Platform Limitations" section (task requirement).
 * - Battery-saver modes on some Android OEMs (e.g. aggressive
 *   manufacturer-specific background-task killers) can interrupt
 *   delivery outside of this module's control. Same treatment: documented
 *   as a known constraint, not "handled" here.
 * - MOCK_MODE (Sprint 4 scope): the GPS ACQUISITION side of this module is
 *   real (real device location via `expo-location`); only the
 *   TRANSMISSION TARGET is mocked, via `sockets.ts`'s `emitLocationUpdate`
 *   always succeeding in MOCK_MODE. See that function's doc comment for
 *   why a full reversed-simulated-stream target wasn't built instead —
 *   this task's real scope is the throttle/buffer/permission logic
 *   sitting above the transmission call, not a fake backend.
 * - Single transmission path: this module NEVER opens its own
 *   `socket.io-client` connection. It sends through `sockets.ts`'s
 *   existing singleton via `emitLocationUpdate()`, and calls
 *   `sockets.joinRoom()` itself on trip start so the connection survives
 *   independent of whether the transporter's `TrackingScreen` (which
 *   joins/leaves the same room on its own mount/unmount) is currently
 *   mounted. `TrackingScreen.tsx`'s unmount cleanup checks
 *   `getTrackingStatus().isTracking` before calling `sockets.leaveRoom()`
 *   for exactly this reason — see the matching comment there. Calling
 *   `joinRoom()` again here when the screen already joined the same room
 *   is a harmless, brief reconnect blip (sockets.ts's `joinRoom` is
 *   idempotent-safe: it tears down and rejoins), not a second connection.
 * - Trip-scoped, never "always on": streaming starts only via an explicit
 *   `startBackgroundTracking()` call and stops immediately on
 *   `stopBackgroundTracking()`, permission loss, or logout (see the
 *   `useAuthStore` subscription below). This is both a user-trust
 *   requirement and a platform-store-review requirement (background
 *   location outside of a legitimate active-trip context is exactly the
 *   kind of thing App Store/Play Store review flags).
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import * as sockets from './sockets';
import { postTrackingPingBatch, type TrackingPingPayload } from '../api/tracking';
import { useAuthStore } from '../state/authStore';
import type { LocationEmitPayload } from '../state/types';

export type { LocationEmitPayload };

const LOCATION_TASK_NAME = 'cargolink-background-location-task';

/**
 * Named constant per the task's Technical Requirements — never a magic
 * number inline. Must stay within the spec's mandated 5–10s band; 7500ms
 * sits in the middle of that range (not reused from
 * `mocks/simulatedRoute.ts`'s `DEFAULT_EMIT_INTERVAL_MS` on purpose — that
 * constant governs the shipper-facing mock REPLAY cadence, a separate
 * concern from this module's real transporter-side emission throttle;
 * importing a `mocks/` constant into a production service module would
 * also be the wrong dependency direction).
 */
export const LOCATION_EMIT_INTERVAL_MS = 7_500;

/** How many buffered pings to retain locally while the socket is
 * unavailable before attempting a REST-fallback flush. In-memory only —
 * lost on app kill, a documented, accepted limitation (see README). */
const MAX_BUFFERED_PINGS = 20;

/** How often to re-check that location permission is still granted while
 * a trip is active, so a mid-trip revocation is detected without relying
 * solely on the TaskManager error callback (which some platforms may not
 * reliably fire for a plain permission toggle). */
const PERMISSION_POLL_INTERVAL_MS = 60_000;

export interface ActiveTrip {
  loadId: string;
  vehicleId: string;
}

export interface TrackingStatus {
  isTracking: boolean;
  loadId: string | null;
  vehicleId: string | null;
  /** ISO8601, or null if no ping has been emitted yet this trip. */
  lastEmittedAt: string | null;
  /** Pings currently held locally because the socket was unavailable
   * when they were due. */
  bufferedCount: number;
  /** True once a permission check while tracking has found background
   * (or foreground) location no longer granted. Cleared automatically if
   * a later poll finds it re-granted, or on `stopBackgroundTracking()`. */
  permissionRevoked: boolean;
}

export interface PermissionRequestResult {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
}

export interface StartTrackingResult {
  started: boolean;
  reason?: 'permission_denied' | 'already_tracking';
  /** Present when `started` is true — false means the trip proceeds on
   * foreground-only permission (per the task's edge case: "Start Trip"
   * cannot proceed without at least foreground granted, but background
   * is requested separately and isn't a hard blocker). Callers should
   * surface this so the transporter understands updates may pause once
   * backgrounded. */
  backgroundGranted?: boolean;
}

let isTracking = false;
let activeTrip: ActiveTrip | null = null;
let lastEmittedAt: number | null = null;
let bufferedPings: LocationEmitPayload[] = [];
let permissionRevoked = false;
let permissionPollTimer: ReturnType<typeof setInterval> | null = null;

const permissionRevokedListeners = new Set<(revoked: boolean) => void>();

function notifyPermissionRevokedListeners(revoked: boolean): void {
  permissionRevokedListeners.forEach((listener) => listener(revoked));
}

/**
 * Subscribes to permission-revoked/restored transitions while a trip is
 * active — the transporter `TrackingScreen` uses this to show/hide the
 * "shipper can no longer see your live position" warning banner. Returns
 * an unsubscribe function.
 */
export function onPermissionRevokedChange(listener: (revoked: boolean) => void): () => void {
  permissionRevokedListeners.add(listener);
  return () => permissionRevokedListeners.delete(listener);
}

function isValidCoordinate(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false; // classic "no fix yet" sentinel
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Attempts to flush the current buffer via the REST fallback
 * (`POST /tracking/ping`, see `api/tracking.ts`). Only the pings that
 * were part of THIS attempt are cleared on success — more may have been
 * buffered (or already flushed via the socket) while the request was in
 * flight. On failure, trims the buffer back down to `MAX_BUFFERED_PINGS`
 * (dropping the oldest first) — but only after a genuine attempt was
 * made, per the task's "never silently dropped without at least an
 * attempt to buffer/flush" requirement.
 */
async function attemptRestFlush(): Promise<void> {
  if (bufferedPings.length === 0) return;
  const pending = [...bufferedPings];
  const payload: TrackingPingPayload[] = pending;
  const result = await postTrackingPingBatch(payload);

  if (result.acknowledged) {
    bufferedPings = bufferedPings.filter((p) => !pending.includes(p));
    return;
  }

  while (bufferedPings.length > MAX_BUFFERED_PINGS) {
    bufferedPings.shift();
  }
}

function bufferPing(payload: LocationEmitPayload): void {
  bufferedPings.push(payload);
  if (bufferedPings.length > MAX_BUFFERED_PINGS) {
    // Buffer is over capacity and the socket is still unavailable —
    // attempt a best-effort REST flush before ever dropping a ping.
    // Fire-and-forget: this function stays synchronous so callers in the
    // throttle path never wait on a network round-trip.
    void attemptRestFlush();
  }
}

/** Sends a payload now if possible, otherwise buffers it for later. */
function dispatch(payload: LocationEmitPayload): void {
  if (sockets.getConnectionState() !== 'live') {
    bufferPing(payload);
    return;
  }
  const sent = sockets.emitLocationUpdate(payload);
  if (!sent) {
    bufferPing(payload);
  }
}

/** Flushes any buffered pings over the (now-live) socket connection.
 * Called automatically on reconnect — see the `onConnectionStateChange`
 * subscription below. Pings that fail to send (connection drops again
 * mid-flush) are put back for the next attempt. */
function flushBufferedPingsViaSocket(): void {
  if (bufferedPings.length === 0) return;
  const pending = [...bufferedPings];
  bufferedPings = [];
  pending.forEach((payload) => {
    const sent = sockets.emitLocationUpdate(payload);
    if (!sent) {
      bufferedPings.push(payload);
    }
  });
}

sockets.onConnectionStateChange((state) => {
  if (state === 'live' && isTracking) {
    flushBufferedPingsViaSocket();
  }
});

/**
 * Core throttle/validate/dispatch logic — invoked by the TaskManager task
 * executor below whenever the OS delivers a location sample. Kept as a
 * plain function (not exported) so `location.test.ts` exercises it the
 * same way production does: via the captured task executor, not a
 * separate test-only entry point.
 */
function handleLocationSample(sample: { lat: number; lng: number; ts: string }): void {
  if (!isTracking || !activeTrip) return;
  if (!isValidCoordinate(sample.lat, sample.lng)) return;

  const now = Date.now();
  if (lastEmittedAt !== null && now - lastEmittedAt < LOCATION_EMIT_INTERVAL_MS) {
    return; // throttled — enforced here even if native delivery outpaces the requested interval
  }
  lastEmittedAt = now;

  dispatch({
    load_id: activeTrip.loadId,
    vehicle_id: activeTrip.vehicleId,
    lat: sample.lat,
    lng: sample.lng,
    ts: sample.ts,
  });
}

/**
 * Registered once at module load, per Expo's requirement that background
 * tasks be defined outside of any component lifecycle. `location.ts`
 * must be imported early enough (the transporter `TrackingScreen`, which
 * now imports it, satisfies this for the transporter flow) for this
 * registration to have run before the OS could ever deliver a background
 * event.
 */
TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    // TaskManager surfaces some permission/availability failures as a
    // task error rather than a clean rejected promise — treat it the
    // same way a failed permission poll would: warn, don't silently end
    // the trip.
    if (!permissionRevoked) {
      permissionRevoked = true;
      notifyPermissionRevokedListeners(true);
    }
    return;
  }

  const locations = data?.locations;
  const latest = locations && locations.length > 0 ? locations[locations.length - 1] : null;
  if (!latest) return;

  handleLocationSample({
    lat: latest.coords.latitude,
    lng: latest.coords.longitude,
    ts: new Date(latest.timestamp).toISOString(),
  });
});

function stopPermissionPoll(): void {
  if (permissionPollTimer) {
    clearInterval(permissionPollTimer);
    permissionPollTimer = null;
  }
}

async function checkPermissionsStillGranted(): Promise<void> {
  if (!isTracking) return;
  try {
    const [foreground, background] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);
    const stillGranted = foreground.granted && background.granted;

    if (!stillGranted && !permissionRevoked) {
      permissionRevoked = true;
      notifyPermissionRevokedListeners(true);
    } else if (stillGranted && permissionRevoked) {
      // Re-granted mid-trip (e.g. the transporter fixed it in Settings
      // without ending the trip) — clear the warning rather than leaving
      // a stale one displayed.
      permissionRevoked = false;
      notifyPermissionRevokedListeners(false);
    }
  } catch {
    // Best-effort — a transient failure here shouldn't itself flip the
    // warning state; the next poll will try again.
  }
}

function startPermissionPoll(): void {
  stopPermissionPoll();
  permissionPollTimer = setInterval(() => {
    void checkPermissionsStillGranted();
  }, PERMISSION_POLL_INTERVAL_MS);
}

/**
 * Requests foreground, then (if granted) background location permission.
 * Used both by `startBackgroundTracking()` and directly by
 * `LocationPermissionPrompt`'s "Continue" action, so the same permission
 * flow isn't implemented twice.
 */
export async function requestTrackingPermissions(): Promise<PermissionRequestResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    return { foregroundGranted: false, backgroundGranted: false };
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  return { foregroundGranted: true, backgroundGranted: background.granted };
}

/**
 * Starts trip-scoped background tracking. Idempotent against a second
 * call while already tracking (returns `{ started: false, reason:
 * 'already_tracking' }` rather than starting a second, overlapping
 * task). "Start Trip" cannot proceed without at least foreground
 * permission; background is requested with its own rationale but isn't
 * a hard blocker (see `StartTrackingResult.backgroundGranted`).
 */
export async function startBackgroundTracking(trip: ActiveTrip): Promise<StartTrackingResult> {
  if (isTracking) {
    return { started: false, reason: 'already_tracking' };
  }

  const { foregroundGranted, backgroundGranted } = await requestTrackingPermissions();
  if (!foregroundGranted) {
    return { started: false, reason: 'permission_denied' };
  }

  activeTrip = trip;
  isTracking = true;
  lastEmittedAt = null;
  bufferedPings = [];
  permissionRevoked = false;

  // Ensures the underlying connection survives regardless of
  // TrackingScreen's mount state — see this file's top comment and the
  // matching note in TrackingScreen.tsx's unmount cleanup.
  sockets.joinRoom(trip.loadId);

  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: LOCATION_EMIT_INTERVAL_MS,
      distanceInterval: 0,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'CargoLink',
        notificationBody: 'Sharing your live location for this trip',
        notificationColor: '#0B5FCC',
      },
    });
  } catch (err) {
    // Starting the native task itself failed (rare — some OEM/permission
    // edge cases) — roll back to a clean not-tracking state rather than
    // leaving isTracking=true with no task actually running underneath
    // it.
    isTracking = false;
    activeTrip = null;
    sockets.leaveRoom();
    throw err;
  }

  startPermissionPoll();

  return { started: true, backgroundGranted };
}

/**
 * Stops tracking: unregisters the native background task, tears down
 * this module's ownership of the socket connection/room, and clears all
 * trip-scoped state (buffer included — undelivered pings from a trip
 * that has explicitly ended are discarded, not carried into the next
 * trip). Safe to call when not tracking (no-op).
 */
export async function stopBackgroundTracking(): Promise<void> {
  if (!isTracking) return;
  isTracking = false;
  stopPermissionPoll();

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch {
    // Best-effort — some platforms/test doubles may throw if the task
    // was never actually started; not fatal to ending the trip
    // client-side.
  }

  sockets.leaveRoom();
  activeTrip = null;
  lastEmittedAt = null;
  bufferedPings = [];
  if (permissionRevoked) {
    permissionRevoked = false;
    notifyPermissionRevokedListeners(false);
  }
}

export function getTrackingStatus(): TrackingStatus {
  return {
    isTracking,
    loadId: activeTrip?.loadId ?? null,
    vehicleId: activeTrip?.vehicleId ?? null,
    lastEmittedAt: lastEmittedAt !== null ? new Date(lastEmittedAt).toISOString() : null,
    bufferedCount: bufferedPings.length,
    permissionRevoked,
  };
}

// Stop immediately on logout — location data is sensitive and must never
// stream outside of an authenticated, active-trip context (security
// requirement). Fire-and-forget: logout itself doesn't wait on this.
useAuthStore.subscribe((state, prevState) => {
  if (prevState.isAuthenticated && !state.isAuthenticated) {
    void stopBackgroundTracking();
  }
});

/* ------------------------------------------------------------------ *
 * Test-only affordances — grouped and leading-underscore-prefixed,
 * matching sockets.ts's convention, so production call sites never
 * reach for them by accident.
 * ------------------------------------------------------------------ */

/** Resets all module-level state between tests. Test-only. */
export function __resetForTests(): void {
  isTracking = false;
  activeTrip = null;
  lastEmittedAt = null;
  bufferedPings = [];
  permissionRevoked = false;
  stopPermissionPoll();
  permissionRevokedListeners.clear();
}

/** Test-only read access to the current buffer contents. */
export function __getBufferedPingsForTests(): LocationEmitPayload[] {
  return [...bufferedPings];
}
