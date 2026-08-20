import type { AxiosError } from 'axios';

import { apiClient } from './client';
import type { LoadFormValues } from '../validation/loadSchema';
import type { MatchResult, AcceptedMatch } from '../state/types';

/**
 * ASSUMPTION (flag for review before merging, same as `api/vehicles.ts` and
 * `api/documents.ts`): `./client` exports a configured, authenticated
 * `apiClient`, and `MOCK_MODE` is re-derived from
 * `process.env.EXPO_PUBLIC_MOCK_MODE` here only until a shared
 * `src/config/env.ts` is confirmed as the single source of truth.
 */
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

/** Request shape for `POST /loads`, per the technical spec (draft, pending freeze). */
export interface PostLoadPayload {
  weight: number;
  cargo_type: LoadFormValues['cargoType'];
  source: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  /** ISO8601 timestamp. */
  deadline: string;
  preferred_vehicle_type: LoadFormValues['preferredVehicleType'];
}

export interface PostLoadResponse {
  load_id: string;
  status: string;
}

/**
 * Structured error so the screen can distinguish "no network" from "the
 * server rejected this load" and message each differently, per the task's
 * edge-case requirements. `client.ts`'s interceptor already handles auth
 * (401/refresh) — this only classifies what's left once a request fails.
 */
export interface LoadPostError {
  kind: 'network' | 'validation' | 'unknown';
  message: string;
}

export function isLoadPostError(err: unknown): err is LoadPostError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'kind' in err &&
    'message' in err &&
    typeof (err as LoadPostError).message === 'string'
  );
}

/** Converts the form's values into the API's request shape. Kept here (not in
 * the screen) so the mapping is unit-testable and the screen never has to
 * know the backend's field-naming conventions. */
export function buildPostLoadPayload(values: LoadFormValues): PostLoadPayload {
  return {
    weight: values.weightKg,
    cargo_type: values.cargoType,
    source: { lat: values.source.lat, lng: values.source.lng },
    destination: { lat: values.destination.lat, lng: values.destination.lng },
    deadline: values.deadline,
    preferred_vehicle_type: values.preferredVehicleType,
  };
}

/**
 * Sentinel weight used by mock mode / tests to simulate a server-side
 * rejection (e.g. "corridor not serviced") without a real backend. This is
 * a mock-mode-only affordance — the real backend decides rejections on its
 * own terms once the contract is live.
 */
export const MOCK_REJECTION_WEIGHT_KG = 99999;

function mockPostLoad(payload: PostLoadPayload): Promise<PostLoadResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.round(payload.weight) === MOCK_REJECTION_WEIGHT_KG) {
        const error: LoadPostError = {
          kind: 'validation',
          message: 'No transporters currently service this corridor. Try a nearby pickup point.',
        };
        reject(error);
        return;
      }
      resolve({ load_id: `mock-load-${Date.now()}`, status: 'posted' });
    }, 500);
  });
}

function toLoadPostError(err: unknown): LoadPostError {
  const axiosErr = err as AxiosError<{ message?: string }> | undefined;

  if (axiosErr?.isAxiosError) {
    if (!axiosErr.response) {
      // Request never reached the server — no connectivity, DNS failure,
      // timeout, etc. Distinct message from a server-side rejection so the
      // shipper knows whether to check their connection or fix their input.
      return {
        kind: 'network',
        message: 'No network connection. Check your connection and try again.',
      };
    }
    return {
      kind: 'validation',
      message:
        axiosErr.response.data?.message ??
        'This load could not be posted. Please review the details and try again.',
    };
  }

  return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
}

/**
 * Posts a load via the real backend. Exported (as well as being called by
 * `postLoad` below) specifically so tests can exercise the real-network
 * path directly against a mocked `apiClient`, without depending on
 * `EXPO_PUBLIC_MOCK_MODE` — that env var is inlined to a literal at babel
 * transform time by `babel-preset-expo` (Expo's standard behavior for
 * `EXPO_PUBLIC_*` vars), so mutating `process.env` at test runtime has no
 * effect on which branch `postLoad` takes. Testing each implementation
 * directly sidesteps that entirely.
 */
export async function postLoadViaApi(values: LoadFormValues): Promise<PostLoadResponse> {
  const payload = buildPostLoadPayload(values);
  try {
    const { data } = await apiClient.post<PostLoadResponse>('/loads', payload);
    return data;
  } catch (err) {
    throw toLoadPostError(err);
  }
}

/** Posts a load via the mock layer. Exported for direct testing — see the
 * note on `postLoadViaApi` above; the same env-inlining constraint applies. */
export async function postLoadMock(values: LoadFormValues): Promise<PostLoadResponse> {
  return mockPostLoad(buildPostLoadPayload(values));
}

/**
 * Posts a new cargo load. Resolves with `{ load_id, status }` on success;
 * rejects with a `LoadPostError` (see `isLoadPostError`) on failure.
 *
 * This is a thin, single-line dispatch on `MOCK_MODE` — the actual mock and
 * real-network behavior (and their test coverage) lives in `postLoadMock`
 * and `postLoadViaApi` respectively.
 */
export async function postLoad(values: LoadFormValues): Promise<PostLoadResponse> {
  return MOCK_MODE ? postLoadMock(values) : postLoadViaApi(values);
}

/* ---------------------------------------------------------------------- *
 * GET /loads/{id}/matches — Task D.2
 * ---------------------------------------------------------------------- */

export interface GetMatchesParams {
  radiusKm?: number;
  limit?: number;
}

export interface GetMatchesError {
  kind: 'network' | 'unknown';
  message: string;
}

export function isGetMatchesError(err: unknown): err is GetMatchesError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'kind' in err &&
    'message' in err &&
    typeof (err as GetMatchesError).message === 'string'
  );
}

/** Sentinel `loadId` used by mock mode / tests to exercise the zero-matches
 * empty state without a real backend — per the task's explicit "a special
 * loadId value returns an empty array" requirement. */
export const MOCK_EMPTY_MATCHES_LOAD_ID = 'mock-load-empty-matches';

/** Sentinel `vehicle_id`, shared with the mock accept-match handler below,
 * so selecting this match from the mock list deterministically exercises
 * the accept-conflict (409-style) recovery path in tests/demos. */
export const MOCK_CONFLICT_VEHICLE_ID = 'mock-vehicle-conflict';

const MOCK_MATCHES: MatchResult[] = [
  { vehicle_id: 'mock-vehicle-1', distance_km: 4.2, capacity_fit: true, eta: '12 min', score: 0.94 },
  { vehicle_id: 'mock-vehicle-2', distance_km: 9.8, capacity_fit: true, eta: '24 min', score: 0.81 },
  { vehicle_id: MOCK_CONFLICT_VEHICLE_ID, distance_km: 6.5, capacity_fit: true, eta: '17 min', score: 0.88 },
  { vehicle_id: 'mock-vehicle-3', distance_km: 15.1, capacity_fit: true, eta: '38 min', score: 0.67 },
];

function mockGetMatches(loadId: string): Promise<MatchResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(loadId === MOCK_EMPTY_MATCHES_LOAD_ID ? [] : MOCK_MATCHES);
    }, 500);
  });
}

function toGetMatchesError(err: unknown): GetMatchesError {
  const axiosErr = err as AxiosError | undefined;
  if (axiosErr?.isAxiosError && !axiosErr.response) {
    return {
      kind: 'network',
      message: 'No network connection. Check your connection and try again.',
    };
  }
  return { kind: 'unknown', message: 'Could not load matches. Please try again.' };
}

/** Exported for direct testing, same reasoning as `postLoadViaApi`/`postLoadMock` above. */
export async function getMatchesViaApi(
  loadId: string,
  params?: GetMatchesParams
): Promise<MatchResult[]> {
  try {
    const { data } = await apiClient.get<MatchResult[]>(`/loads/${loadId}/matches`, {
      params: { radius_km: params?.radiusKm, limit: params?.limit },
    });
    return data;
  } catch (err) {
    throw toGetMatchesError(err);
  }
}

export async function getMatchesMock(loadId: string): Promise<MatchResult[]> {
  return mockGetMatches(loadId);
}

/**
 * Fetches ranked matches for a posted load, sorted by `score` descending as
 * returned by the backend/mock — no client-side re-sort. Resolves with `[]`
 * for a load with no matches (a normal, non-error outcome the screen must
 * render as an empty state, not a failure).
 */
export async function getMatches(
  loadId: string,
  params?: GetMatchesParams
): Promise<MatchResult[]> {
  return MOCK_MODE ? getMatchesMock(loadId) : getMatchesViaApi(loadId, params);
}

/* ---------------------------------------------------------------------- *
 * POST /loads/{id}/accept — Task D.2
 * ---------------------------------------------------------------------- */

export interface AcceptMatchError {
  kind: 'conflict' | 'network' | 'unknown';
  message: string;
}

export function isAcceptMatchError(err: unknown): err is AcceptMatchError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'kind' in err &&
    'message' in err &&
    typeof (err as AcceptMatchError).message === 'string'
  );
}

function mockAcceptMatch(loadId: string, vehicleId: string): Promise<AcceptedMatch> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (vehicleId === MOCK_CONFLICT_VEHICLE_ID) {
        const error: AcceptMatchError = {
          kind: 'conflict',
          message: 'This transporter is no longer available — please refresh and choose another.',
        };
        reject(error);
        return;
      }
      resolve({ match_id: `mock-match-${loadId}-${Date.now()}`, status: 'accepted' });
    }, 500);
  });
}

function toAcceptMatchError(err: unknown): AcceptMatchError {
  const axiosErr = err as AxiosError<{ message?: string }> | undefined;

  if (axiosErr?.isAxiosError) {
    if (!axiosErr.response) {
      return {
        kind: 'network',
        message: 'No network connection. Check your connection and try again.',
      };
    }
    if (axiosErr.response.status === 409) {
      return {
        kind: 'conflict',
        message:
          axiosErr.response.data?.message ??
          'This transporter is no longer available — please refresh and choose another.',
      };
    }
    return {
      kind: 'unknown',
      message: axiosErr.response.data?.message ?? 'Could not accept this match. Please try again.',
    };
  }

  return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
}

/** Exported for direct testing, same reasoning as `postLoadViaApi`/`postLoadMock` above. */
export async function acceptMatchViaApi(loadId: string, vehicleId: string): Promise<AcceptedMatch> {
  try {
    const { data } = await apiClient.post<AcceptedMatch>(`/loads/${loadId}/accept`, {
      vehicle_id: vehicleId,
    });
    return data;
  } catch (err) {
    throw toAcceptMatchError(err);
  }
}

export async function acceptMatchMock(loadId: string, vehicleId: string): Promise<AcceptedMatch> {
  return mockAcceptMatch(loadId, vehicleId);
}

/**
 * Accepts a matched transporter for a load. Resolves with `{ match_id,
 * status }`; rejects with an `AcceptMatchError` — `kind: 'conflict'` means
 * this specific match became unavailable (a realistic marketplace race
 * condition) and must route to the refresh-matches recovery path rather
 * than a plain retry, since retrying the same call would fail again.
 */
export async function acceptMatch(loadId: string, vehicleId: string): Promise<AcceptedMatch> {
  return MOCK_MODE ? acceptMatchMock(loadId, vehicleId) : acceptMatchViaApi(loadId, vehicleId);
}
