import MockAdapter from 'axios-mock-adapter';

import { apiClient } from './client';
import {
  getTrackingHistoryMock,
  getTrackingHistoryViaApi,
  isGetTrackingHistoryError,
} from './tracking';

jest.mock('../state/authStore', () => ({
  useAuthStore: { getState: () => ({ token: null, refreshToken: null, logout: jest.fn() }) },
}));

// Tests `getTrackingHistoryMock`/`getTrackingHistoryViaApi` directly
// rather than the `EXPO_PUBLIC_MOCK_MODE`-gated `getTrackingHistory`
// dispatcher, for the same reason `api/loads.test.ts` does — see the note
// there and in tracking.ts.

describe('getTrackingHistoryMock', () => {
  it('resolves with a short chronological history (oldest first, most recent last)', async () => {
    const history = await getTrackingHistoryMock();

    expect(history.length).toBeGreaterThan(0);
    expect(history.every((p) => typeof p.lat === 'number' && typeof p.lng === 'number')).toBe(true);

    const timestamps = history.map((p) => new Date(p.timestamp).getTime());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });
});

describe('getTrackingHistoryViaApi', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.reset();
  });

  afterAll(() => {
    mock.restore();
  });

  it('requests the tracking endpoint with from/to query params and resolves with the response body', async () => {
    // Assertions must not live inside .reply() — see the established note
    // in api/loads.test.ts (axios-mock-adapter swallows thrown assertions
    // there rather than propagating them as a test failure).
    let seenParams: unknown;
    mock.onGet('/tracking/vehicle-1').reply((config) => {
      seenParams = config.params;
      return [200, [{ lat: 18.5, lng: 73.8, timestamp: '2026-01-01T00:00:00.000Z' }]];
    });

    const results = await getTrackingHistoryViaApi('vehicle-1', { from: 'a', to: 'b' });

    expect(seenParams).toEqual({ from: 'a', to: 'b' });
    expect(results).toEqual([{ lat: 18.5, lng: 73.8, timestamp: '2026-01-01T00:00:00.000Z' }]);
  });

  it('classifies a response-less failure as a network error', async () => {
    mock.onGet('/tracking/vehicle-1').networkError();

    await expect(getTrackingHistoryViaApi('vehicle-1')).rejects.toMatchObject({ kind: 'network' });
  });

  it('classifies any server-side failure as unknown', async () => {
    mock.onGet('/tracking/vehicle-1').reply(500);

    await expect(getTrackingHistoryViaApi('vehicle-1')).rejects.toMatchObject({ kind: 'unknown' });
  });
});

describe('isGetTrackingHistoryError', () => {
  it('recognizes a GetTrackingHistoryError shape and rejects non-matching values', () => {
    expect(isGetTrackingHistoryError({ kind: 'network', message: 'x' })).toBe(true);
    expect(isGetTrackingHistoryError(new Error('x'))).toBe(false);
    expect(isGetTrackingHistoryError(null)).toBe(false);
    expect(isGetTrackingHistoryError(undefined)).toBe(false);
  });
});
