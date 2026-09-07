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
