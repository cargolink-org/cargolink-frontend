import type { AxiosError } from 'axios';

import { apiClient } from './client';
import { SIMULATED_ROUTE_POINTS } from '../mocks/simulatedRoute';

/**
 * `GET /tracking/{vehicleId} ?from=&to=` — technical spec (draft, pending
 * freeze). Same `MOCK_MODE` re-derivation caveat as `api/loads.ts`/
 * `api/pricing.ts` until a shared `src/config/env.ts` is confirmed.
 */
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

export interface TrackingHistoryPoint {
  lat: number;
  lng: number;
  /** ISO8601 timestamp. */
  timestamp: string;
}

export interface GetTrackingHistoryParams {
  from?: string;
  to?: string;
}

export interface GetTrackingHistoryError {
  kind: 'network' | 'unknown';
  message: string;
}

export function isGetTrackingHistoryError(err: unknown): err is GetTrackingHistoryError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'kind' in err &&
    'message' in err &&
    typeof (err as GetTrackingHistoryError).message === 'string'
  );
}

/**
 * A short canned history (the first few points of the same simulated
 * route `sockets.ts` uses in MOCK_MODE) so the shipper's screen has a
 * last-known marker to render immediately on mount, before the live
 * socket stream produces its first update — mirrors what a real backend
 * would return for a vehicle already mid-trip.
 */
function mockGetTrackingHistory(): Promise<TrackingHistoryPoint[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = Date.now();
      const history = SIMULATED_ROUTE_POINTS.slice(0, 2).map((point, i) => ({
        lat: point.lat,
        lng: point.lng,
        // Oldest point first, most recent last — matches a real
        // chronological history response.
        timestamp: new Date(now - (2 - i) * 60_000).toISOString(),
      }));
      resolve(history);
    }, 300);
  });
}

function toGetTrackingHistoryError(err: unknown): GetTrackingHistoryError {
  const axiosErr = err as AxiosError | undefined;
  if (axiosErr?.isAxiosError && !axiosErr.response) {
    return {
      kind: 'network',
      message: 'No network connection. Check your connection and try again.',
    };
  }
  return { kind: 'unknown', message: 'Could not load tracking history.' };
}

/** Exported for direct testing, same reasoning as `getMatchesViaApi`/
 * `getMatchesMock` in `api/loads.ts` — the env-inlining constraint means
 * the env-gated dispatcher (`getTrackingHistory` below) can't be branched
 * at test runtime. */
export async function getTrackingHistoryViaApi(
  vehicleId: string,
  params?: GetTrackingHistoryParams
): Promise<TrackingHistoryPoint[]> {
  try {
    const { data } = await apiClient.get<TrackingHistoryPoint[]>(`/tracking/${vehicleId}`, {
      params: { from: params?.from, to: params?.to },
    });
    return data;
  } catch (err) {
    throw toGetTrackingHistoryError(err);
  }
}

export async function getTrackingHistoryMock(): Promise<TrackingHistoryPoint[]> {
  return mockGetTrackingHistory();
}

/**
 * Fetches recent position history for a vehicle, used to render a
 * last-known marker before the live socket stream takes over. Per the
 * task's edge case, a failure here is non-blocking — callers should show
 * the map without a trail rather than blocking the whole screen; this
 * function still rejects on failure so the caller can decide how to
 * degrade (it does not silently swallow errors itself).
 */
export async function getTrackingHistory(
  vehicleId: string,
  params?: GetTrackingHistoryParams
): Promise<TrackingHistoryPoint[]> {
  return MOCK_MODE ? getTrackingHistoryMock() : getTrackingHistoryViaApi(vehicleId, params);
}

/* ------------------------------------------------------------------ *
 * POST /tracking/ping — Task E.2 REST fallback for buffered pings
 *
 * Only used when `location.ts`'s primary path (a Socket.io
 * `location_update` emit — see `services/sockets.ts`'s `emitLocationUpdate`)
 * has been unable to reach a live connection and its local buffer is full.
 * NOT part of the steady-state transmission flow. Route/shape are pending
 * contract confirmation — the technical spec's §5 endpoint table doesn't
 * list this route yet; named/shaped to match the existing
 * `/tracking/{vehicleId}` GET's conventions in the meantime. Kept
 * isolated here so it's obvious this is a fallback, not the primary
 * flow, and easy to re-point once Dinesh's OpenAPI contract confirms the
 * real shape.
 * ------------------------------------------------------------------ */

export interface TrackingPingPayload {
  load_id: string;
  vehicle_id: string;
  lat: number;
  lng: number;
  /** ISO8601 timestamp. */
  ts: string;
}

export interface PostTrackingPingBatchResponse {
  acknowledged: boolean;
}

/** Mock: accepts and echoes back a success acknowledgment, per the task's
 * API Requirements ("Mock implementation: accepts and echoes back a
 * success acknowledgment for testing the flush-on-reconnect path"). */
function mockPostTrackingPingBatch(pings: TrackingPingPayload[]): Promise<PostTrackingPingBatchResponse> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ acknowledged: pings.length > 0 }), 200);
  });
}

/** Exported for direct testing, same reasoning as `getTrackingHistoryViaApi`
 * above. */
export async function postTrackingPingBatchViaApi(
  pings: TrackingPingPayload[]
): Promise<PostTrackingPingBatchResponse> {
  const { data } = await apiClient.post<PostTrackingPingBatchResponse>('/tracking/ping', { pings });
  return data;
}

export async function postTrackingPingBatchMock(
  pings: TrackingPingPayload[]
): Promise<PostTrackingPingBatchResponse> {
  return mockPostTrackingPingBatch(pings);
}

/**
 * Flushes a batch of buffered pings via REST. Unlike the other functions
 * in this file, this NEVER rejects — it swallows any network/server
 * error and resolves `{ acknowledged: false }` instead. This is
 * deliberate: `location.ts` calls this as a best-effort fallback attempt
 * from inside its own buffering logic, and treating "the fallback also
 * failed" as a normal, retriable outcome (rather than an exception every
 * call site must remember to catch) is a better fit for a background
 * task than throwing would be.
 */
export async function postTrackingPingBatch(
  pings: TrackingPingPayload[]
): Promise<PostTrackingPingBatchResponse> {
  if (pings.length === 0) return { acknowledged: true };
  try {
    return MOCK_MODE ? await postTrackingPingBatchMock(pings) : await postTrackingPingBatchViaApi(pings);
  } catch {
    return { acknowledged: false };
  }
}
