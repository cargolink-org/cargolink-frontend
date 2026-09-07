/**
 * simulatedRoute.ts
 *
 * Sprint 4 mock data source for the live-tracking screens (Task E.1) — a
 * canned short-haul route plus a mock event emitter that replays it at the
 * same throttled cadence the real transporter app will emit at (Task E.2),
 * dispatched through the exact same `{ lat, lng, ts }` payload shape and
 * connection-state callback `sockets.ts` uses for a real `location:update`
 * socket event. This is what makes the Sprint 6+ swap to a real
 * python-socketio connection a `MOCK_MODE` flip inside `sockets.ts`, not a
 * rewrite of anything that consumes it (screens, trackingStore).
 *
 * Not sourced from Kishor's seed data yet — the Database track hasn't
 * exported tracking fixtures into `shared/mock-data` at this point in the
 * timeline. Authored locally, per the task's explicit note that this is
 * expected/acceptable for Sprint 4.
 */

import type { ConnectionState, LocationUpdatePayload } from '../state/types';

/**
 * A short, plausible haul (approximate Pune -> Mumbai direction, a handful
 * of waypoints) — purely illustrative for demo/dev purposes, not routed
 * against real roads or OSRM.
 */
export const SIMULATED_ROUTE_POINTS: Array<{ lat: number; lng: number }> = [
  { lat: 18.5204, lng: 73.8567 },
  { lat: 18.5793, lng: 73.7629 },
  { lat: 18.6298, lng: 73.5931 },
  { lat: 18.6929, lng: 73.31 },
  { lat: 18.7601, lng: 73.0183 },
  { lat: 18.8712, lng: 72.99 },
  { lat: 18.9894, lng: 72.9256 },
  { lat: 19.076, lng: 72.8777 },
];

/**
 * Default emit cadence — matches the confirmed 5-10s throttle (Task E.2);
 * picked from the middle of that range. Tests override via `intervalMs` so
 * they don't need to wait on real wall-clock time.
 */
export const DEFAULT_EMIT_INTERVAL_MS = 7000;

/** How long a simulated disconnect keeps the emitter paused in
 * 'reconnecting' before recovering back to 'live' on its own. */
export const SIMULATED_RECONNECT_DELAY_MS = 2500;

export interface SimulatedEmitterHandlers {
  onLocationUpdate: (payload: LocationUpdatePayload) => void;
  onConnectionStateChange: (state: ConnectionState) => void;
}

export interface SimulatedEmitterOptions {
  /** Overrides the default 5-10s-matching cadence — primarily for tests. */
  intervalMs?: number;
  /** Route to replay; defaults to SIMULATED_ROUTE_POINTS. Looping restarts
   * from the first point once exhausted, so a demo/dev session doesn't
   * just stop after working through the list once. */
  points?: Array<{ lat: number; lng: number }>;
}

export interface SimulatedEmitter {
  start: () => void;
  stop: () => void;
  /**
   * Simulates a mid-trip socket disconnect: pauses emission and reports
   * 'reconnecting', then recovers to 'live' on its own after a short
   * delay — exercising the same UI path a real disconnect/reconnect cycle
   * would, without a real socket server.
   */
  simulateDisconnect: () => void;
  /**
   * Simulates an extended no-GPS-signal gap: pauses emission WITHOUT
   * changing connection state. Per the task's edge case, "last seen X
   * minutes ago" is meant to be driven by `lastUpdatedAt` going stale
   * while the connection nominally still reads 'live' — a real signal
   * gap doesn't necessarily mean the socket itself dropped.
   */
  simulateStaleConnection: () => void;
}

/**
 * Creates a mock emitter. Every dispatch goes through `handlers` — the
 * same callback shape `sockets.ts` wires a real `socket.on('location:update',
 * ...)` handler through — so nothing downstream can tell mock and real
 * apart except by import source.
 */
export function createSimulatedEmitter(
  handlers: SimulatedEmitterHandlers,
  options: SimulatedEmitterOptions = {}
): SimulatedEmitter {
  const points = options.points ?? SIMULATED_ROUTE_POINTS;
  const intervalMs = options.intervalMs ?? DEFAULT_EMIT_INTERVAL_MS;

  let index = 0;
  let intervalTimer: ReturnType<typeof setInterval> | null = null;
  let startTimer: ReturnType<typeof setTimeout> | null = null;
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let paused = false;
  let stopped = true;

  function emitNext() {
    if (paused || stopped) return;
    const point = points[index % points.length];
    index += 1;
    handlers.onLocationUpdate({ lat: point.lat, lng: point.lng, ts: new Date().toISOString() });
  }

  function clearTimers() {
    if (intervalTimer) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
  }

  return {
    start() {
      if (!stopped) return; // already running — no-op, not a restart
      stopped = false;
      paused = false;
      index = 0;
      handlers.onConnectionStateChange('connecting');
      // First point arrives quickly so the screen isn't stuck on a
      // "connecting" skeleton for a full interval before anything renders.
      startTimer = setTimeout(() => {
        if (stopped) return;
        handlers.onConnectionStateChange('live');
        emitNext();
      }, 300);
      intervalTimer = setInterval(emitNext, intervalMs);
    },

    stop() {
      stopped = true;
      paused = false;
      clearTimers();
    },

    simulateDisconnect() {
      if (stopped) return;
      paused = true;
      if (disconnectTimer) clearTimeout(disconnectTimer);
      handlers.onConnectionStateChange('reconnecting');
      disconnectTimer = setTimeout(() => {
        if (stopped) return;
        paused = false;
        handlers.onConnectionStateChange('live');
      }, SIMULATED_RECONNECT_DELAY_MS);
    },

    simulateStaleConnection() {
      if (stopped) return;
      paused = true;
    },
  };
}
