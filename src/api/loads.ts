import type { AxiosError } from 'axios';

import { apiClient } from './client';
import type { LoadFormValues } from '../validation/loadSchema';

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
