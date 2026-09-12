/**
 * sockets.ts
 *
 * Singleton Socket.io connection manager for live GPS tracking (Task E.1).
 *
 * Connects ONCE for the app's lifetime — screens call `joinRoom(loadId)` /
 * `leaveRoom()` against this shared module rather than each screen
 * creating its own `socket.io-client` instance. A `TrackingScreen`
 * mount/unmount cycle only ever subscribes/unsubscribes a room and its
 * listeners; it never renegotiates a brand-new connection.
 *
 * Platform-specific gotchas:
 * - MOCK_MODE (Sprint 4 — no real python-socketio server exists yet on the
 *   frontend's side): this module does not open a real `socket.io-client`
 *   connection at all. `joinRoom`/`leaveRoom` instead drive
 *   `mocks/simulatedRoute.ts`'s emitter through the exact same internal
 *   dispatch path (`emitLocationUpdate`/`emitConnectionState`) a real
 *   `location:update` socket event uses. Every screen/store consumer is
 *   identical in both modes; only `connectSocketMode()` below branches.
 *   This is deliberate — it's what makes the Sprint 6+ swap to a live
 *   backend connection a mode flip, not a screen or store rewrite.
 * - Because `EXPO_PUBLIC_*` env vars are inlined to literals by
 *   babel-preset-expo at transform time (same constraint documented in
 *   `api/loads.ts`), a plain `process.env.EXPO_PUBLIC_MOCK_MODE` check
 *   can't be flipped at test runtime. `isMockMode()` below checks a
 *   plain-variable test override first (`__setMockModeForTests`) before
 *   falling back to the inlined env value, so `sockets.test.ts` can
 *   exercise both the simulated and (mocked-`socket.io-client`) real paths
 *   in the same file.
 * - Auth: the current access token is read fresh from `authStore` on every
 *   (re)connect, never cached at module-load time. The module subscribes
 *   to `authStore` so a token rotation (Cluster B's refresh interceptor,
 *   which calls `setAccessToken`) triggers a reconnect with the new token
 *   instead of the socket silently continuing on a stale one.
 * - Reconnect/backoff is modeled as an explicit state machine
 *   ('connecting' -> 'live' -> 'reconnecting' -> 'lost'), matching
 *   `ConnectionState` in `state/types.ts` — no ad hoc booleans.
 * - Task E.2 adds `emitLocationUpdate()`, the OUTGOING counterpart to
 *   `onLocationUpdate()` — used by `location.ts`'s background task to
 *   send the transporter's position over this same singleton connection.
 *   Nothing else in this module changes: E.2 sends through the existing
 *   room/connection, it doesn't add a second one.
 */

import { io, type Socket } from 'socket.io-client';

import { useAuthStore } from '../state/authStore';
import { createSimulatedEmitter, type SimulatedEmitter } from '../mocks/simulatedRoute';
import type { ConnectionState, LocationEmitPayload, LocationUpdatePayload } from '../state/types';

export type { LocationEmitPayload, LocationUpdatePayload };

const ENV_MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Reconnect attempts before giving up and reporting 'lost'. */
const MAX_RECONNECT_ATTEMPTS = 5;
/** Exponential backoff base — attempt N waits `BASE_BACKOFF_MS * 2^N`. */
const BASE_BACKOFF_MS = 1000;

type LocationListener = (payload: LocationUpdatePayload) => void;
type ConnectionListener = (state: ConnectionState) => void;

let mockModeOverride: boolean | null = null;

/** See the class-level comment above re: babel's env-var inlining. */
function isMockMode(): boolean {
  return mockModeOverride ?? ENV_MOCK_MODE;
}

let socket: Socket | null = null;
let simulatedEmitter: SimulatedEmitter | null = null;
let currentRoom: string | null = null;
let connectionState: ConnectionState = 'connecting';
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const locationListeners = new Set<LocationListener>();
const connectionListeners = new Set<ConnectionListener>();

function emitConnectionState(next: ConnectionState) {
  if (connectionState === next) return;
  connectionState = next;
  connectionListeners.forEach((listener) => listener(next));
}

/**
 * Dispatches a RECEIVED `location:update` event to local subscribers
 * (`onLocationUpdate` listeners) — renamed from the original `emitLocationUpdate`
 * (Task E.1) to `dispatchLocationUpdate` here in Task E.2, to free up the
 * `emitLocationUpdate` name for the new public, OUTGOING-emit function
 * below, which is the more natural fit for that name (it actually emits
 * over the wire; this one only fans out to in-process listeners).
 */
function dispatchLocationUpdate(payload: LocationUpdatePayload) {
  locationListeners.forEach((listener) => listener(payload));
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/** Tears down whatever connection strategy (real socket or simulated
 * emitter) is currently active. Safe to call repeatedly / when nothing is
 * active. Does NOT touch `currentRoom` or `connectionState` — callers
 * decide those separately. */
function teardownConnection() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  if (simulatedEmitter) {
    simulatedEmitter.stop();
    simulatedEmitter = null;
  }
  clearReconnectTimer();
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    emitConnectionState('lost');
    return;
  }
  emitConnectionState('reconnecting');
  const delay = BASE_BACKOFF_MS * 2 ** reconnectAttempts;
  reconnectAttempts += 1;
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    if (!currentRoom) return; // left the room while waiting to reconnect
    connectSocketMode();
  }, delay);
}

function connectReal() {
  const { token } = useAuthStore.getState();

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    // This module drives its own backoff state machine rather than
    // socket.io-client's built-in reconnection, so connectionState stays
    // an explicit, testable enum instead of two overlapping mechanisms.
    reconnection: false,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    reconnectAttempts = 0;
    emitConnectionState('live');
    if (currentRoom) {
      socket?.emit('join', { room: currentRoom });
    }
  });

  socket.on('location:update', (payload: LocationUpdatePayload) => {
    dispatchLocationUpdate(payload);
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return; // intentional leaveRoom(), not a failure
    scheduleReconnect();
  });

  socket.on('connect_error', () => {
    if (!currentRoom) return;
    scheduleReconnect();
  });
}

function connectSimulated() {
  simulatedEmitter = createSimulatedEmitter({
    onLocationUpdate: dispatchLocationUpdate,
    onConnectionStateChange: (state) => {
      emitConnectionState(state);
      if (state === 'live') reconnectAttempts = 0;
    },
  });
  simulatedEmitter.start();
}

function connectSocketMode() {
  teardownConnection();
  if (isMockMode()) {
    connectSimulated();
  } else {
    connectReal();
  }
}

// Re-authenticate on token rotation rather than silently continuing on a
// stale token (Cluster B's client.ts calls setAccessToken() after a
// successful POST /auth/refresh) — only matters while a room is actively
// joined and we're talking to a real server.
useAuthStore.subscribe((state, prevState) => {
  if (state.token !== prevState.token && currentRoom && !isMockMode()) {
    reconnectAttempts = 0;
    connectSocketMode();
  }
});

/**
 * Joins `load:{loadId}` and (re)starts the connection targeting it. Safe
 * to call again with a different `loadId` without an explicit
 * `leaveRoom()` first — it tears down any existing connection/room before
 * joining the new one.
 */
export function joinRoom(loadId: string): void {
  currentRoom = `load:${loadId}`;
  reconnectAttempts = 0;
  emitConnectionState('connecting');
  connectSocketMode();
}

/**
 * Leaves the current room and tears the connection down entirely. Must be
 * called on screen unmount without exception — verified by
 * `sockets.test.ts`'s listener-cleanup test — since a leaked connection
 * would keep emitting location/connection events toward listeners a
 * screen that's no longer mounted forgot to unsubscribe.
 */
export function leaveRoom(): void {
  currentRoom = null;
  teardownConnection();
  connectionState = 'connecting';
}

/**
 * Subscribes to `location:update` events (real or simulated, identical
 * shape either way). Returns an unsubscribe function — screens MUST call
 * this on unmount, in addition to `leaveRoom()`.
 */
export function onLocationUpdate(listener: LocationListener): () => void {
  locationListeners.add(listener);
  return () => locationListeners.delete(listener);
}

/**
 * Subscribes to connection-state transitions. Returns an unsubscribe
 * function — screens MUST call this on unmount, in addition to
 * `leaveRoom()`.
 */
export function onConnectionStateChange(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

export function getConnectionState(): ConnectionState {
  return connectionState;
}

/**
 * Emits a `location_update` event FROM the client, over this module's
 * existing singleton connection (Task E.2) — the transporter-side
 * counterpart to `onLocationUpdate`'s receive path. `location.ts` is the
 * only caller; it never opens a second connection of its own, per Task
 * E.2's "single transmission path" architecture requirement.
 *
 * Returns `true` when the emission was handed off successfully and the
 * caller does NOT need to buffer it; `false` when the caller should
 * buffer and retry later.
 *
 * - MOCK_MODE (Sprint 4 scope, unchanged from E.1's simulated-stream
 *   precedent): always returns `true`. There is no real
 *   `python-socketio` `location_update` handler to hit yet on the
 *   frontend's side — Sprint 4's mock is the TRANSMISSION TARGET, not
 *   the GPS acquisition above this call (that part is real, see
 *   `location.ts`). Treating every mock-mode emit as accepted mirrors
 *   how `connectSimulated()` above always reports 'live' rather than
 *   modelling a fake server that can reject requests.
 * - Real mode: requires an already-connected socket (`joinRoom()` must
 *   have been called — by the transporter's own `TrackingScreen`, or by
 *   `location.ts` itself when a trip starts while that screen isn't
 *   mounted). Returns `false` if there's no live socket to emit on.
 */
export function emitLocationUpdate(payload: LocationEmitPayload): boolean {
  if (isMockMode()) {
    return true;
  }
  if (!socket || connectionState !== 'live') {
    return false;
  }
  socket.emit('location_update', payload);
  return true;
}

/* ------------------------------------------------------------------ *
 * Test-only affordances — simulate real-world scenarios without a real
 * socket server, and control which code path (mock vs. real) runs
 * independent of the babel-inlined env var. Leading-underscore-prefixed
 * and grouped here so production call sites never reach for them by
 * accident; `__DEV__`/test-only usage is enforced by convention, not by
 * a build-time strip, since Jest needs to import them directly.
 * ------------------------------------------------------------------ */

/** Forces `isMockMode()` to a specific value, or `null` to fall back to
 * the env-derived default. Test-only. */
export function __setMockModeForTests(value: boolean | null): void {
  mockModeOverride = value;
}

/** No-op unless a simulated emitter is currently active (MOCK_MODE + a
 * joined room). Test-only. */
export function __simulateDisconnect(): void {
  simulatedEmitter?.simulateDisconnect();
}

/** No-op unless a simulated emitter is currently active. Test-only. */
export function __simulateStaleConnection(): void {
  simulatedEmitter?.simulateStaleConnection();
}

/** Resets all module-level state between tests — ES modules are cached
 * singletons within a test file, so without this, state (currentRoom,
 * reconnectAttempts, listeners, mockModeOverride) would leak across
 * `it()` blocks. Test-only. */
export function __resetForTests(): void {
  currentRoom = null;
  teardownConnection();
  connectionState = 'connecting';
  reconnectAttempts = 0;
  mockModeOverride = null;
  locationListeners.clear();
  connectionListeners.clear();
}
