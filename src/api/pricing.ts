import type { AxiosError } from 'axios';

import { apiClient } from './client';
import type { FareQuote } from '../state/types';

// See src/api/loads.ts for the same ASSUMPTION note on `apiClient` and
// `MOCK_MODE` — kept consistent across every api/ module until a shared
// src/config/env.ts is confirmed as the single source of truth.
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

export interface FareQuoteError {
  kind: 'network' | 'unknown';
  message: string;
}

export function isFareQuoteError(err: unknown): err is FareQuoteError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'kind' in err &&
    'message' in err &&
    typeof (err as FareQuoteError).message === 'string'
  );
}

/**
 * Sentinel `vehicle_id` used by mock mode / tests to simulate a fare that
 * has changed since the shipper first viewed it — the task's "stale quote"
 * edge case. The mock keeps a call count per `loadId:vehicleId`: the first
 * call returns the quote "as viewed"; every call after that returns a
 * higher total, simulating the price having moved before Accept is
 * pressed. `__resetMockPricingState` clears this between tests, since it's
 * otherwise process-lifetime module state.
 */
export const MOCK_STALE_QUOTE_VEHICLE_ID = 'mock-vehicle-stale-quote';

const STABLE_MOCK_QUOTE: FareQuote = {
  base_fare: 2500,
  distance_cost: 1400,
  surcharge: 300,
  total: 4200,
};

const staleQuoteCallCounts = new Map<string, number>();

/** Test-only helper — resets the stale-quote simulation's internal call
 * counter. Call this in `beforeEach` in any test that exercises
 * `MOCK_STALE_QUOTE_VEHICLE_ID` more than once. */
export function __resetMockPricingState(): void {
  staleQuoteCallCounts.clear();
}

function mockGetQuote(loadId: string, vehicleId: string): Promise<FareQuote> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (vehicleId === MOCK_STALE_QUOTE_VEHICLE_ID) {
        const key = `${loadId}:${vehicleId}`;
        const callNumber = (staleQuoteCallCounts.get(key) ?? 0) + 1;
        staleQuoteCallCounts.set(key, callNumber);

        if (callNumber === 1) {
          resolve(STABLE_MOCK_QUOTE);
          return;
        }
        // Every re-check after the first returns a higher total — the
        // price moved since the shipper last saw it.
        resolve({ base_fare: 2500, distance_cost: 1400, surcharge: 750, total: 4650 });
        return;
      }
      resolve(STABLE_MOCK_QUOTE);
    }, 400);
  });
}

function toFareQuoteError(err: unknown): FareQuoteError {
  const axiosErr = err as AxiosError | undefined;
  if (axiosErr?.isAxiosError && !axiosErr.response) {
    return {
      kind: 'network',
      message: 'No network connection. Check your connection and try again.',
    };
  }
  return { kind: 'unknown', message: 'Could not load the fare quote. Please try again.' };
}

/** Exported for direct testing, same reasoning as `postLoadViaApi`/`postLoadMock` in loads.ts. */
export async function getQuoteViaApi(loadId: string, vehicleId?: string): Promise<FareQuote> {
  try {
    // The documented draft shape scopes the quote by `load_id` only
    // (`GET /pricing/quote ?load_id=`). `vehicleId` is accepted here and
    // passed through in case per-vehicle scoping is added at contract
    // freeze, but is not required by the current draft.
    const { data } = await apiClient.get<FareQuote>('/pricing/quote', {
      params: { load_id: loadId, vehicle_id: vehicleId },
    });
    return data;
  } catch (err) {
    throw toFareQuoteError(err);
  }
}

export async function getQuoteMock(loadId: string, vehicleId: string): Promise<FareQuote> {
  return mockGetQuote(loadId, vehicleId);
}

/**
 * Fetches the priced fare breakdown for a load/vehicle pairing. Resolves
 * with `{ base_fare, distance_cost, surcharge, total }`; rejects with a
 * `FareQuoteError` on failure. Called both on `FareQuoteScreen` mount and
 * again, silently, right before Accept is submitted, to detect a
 * changed/stale price (see `FareQuoteScreen`'s accept handler).
 */
export async function getQuote(loadId: string, vehicleId: string): Promise<FareQuote> {
  return MOCK_MODE ? getQuoteMock(loadId, vehicleId) : getQuoteViaApi(loadId, vehicleId);
}
