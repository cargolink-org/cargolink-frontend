import MockAdapter from 'axios-mock-adapter';

import { apiClient } from './client';
import {
  getTrackingHistoryMock,
  getTrackingHistoryViaApi,
  isGetTrackingHistoryError,
  postTrackingPingBatch,
  postTrackingPingBatchMock,
  postTrackingPingBatchViaApi,
  type TrackingPingPayload,
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

const SAMPLE_PING: TrackingPingPayload = {
  load_id: 'load-1',
  vehicle_id: 'veh-1',
  lat: 18.5,
  lng: 73.8,
  ts: '2026-01-01T00:00:00.000Z',
};

describe('postTrackingPingBatchMock (Task E.2 REST fallback)', () => {
  it('acknowledges a non-empty batch', async () => {
    const result = await postTrackingPingBatchMock([SAMPLE_PING]);
    expect(result).toEqual({ acknowledged: true });
  });

  it('does not acknowledge an empty batch', async () => {
    const result = await postTrackingPingBatchMock([]);
    expect(result).toEqual({ acknowledged: false });
  });
});

describe('postTrackingPingBatchViaApi', () => {
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

  it('posts the buffered pings and resolves with the response body', async () => {
    let seenBody: unknown;
    mock.onPost('/tracking/ping').reply((config) => {
      seenBody = JSON.parse(config.data as string);
      return [200, { acknowledged: true }];
    });

    const result = await postTrackingPingBatchViaApi([SAMPLE_PING]);

    expect(seenBody).toEqual({ pings: [SAMPLE_PING] });
    expect(result).toEqual({ acknowledged: true });
  });

  it('rejects on a server-side failure (caller — postTrackingPingBatch — is responsible for swallowing it)', async () => {
    mock.onPost('/tracking/ping').reply(500);

    await expect(postTrackingPingBatchViaApi([SAMPLE_PING])).rejects.toBeTruthy();
  });
});

describe('postTrackingPingBatch (never-rejects wrapper)', () => {
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

  it('resolves { acknowledged: true } immediately for an empty batch, without a network call', async () => {
    const result = await postTrackingPingBatch([]);
    expect(result).toEqual({ acknowledged: true });
  });

  it('resolves { acknowledged: false } instead of rejecting when the real request fails', async () => {
    mock.onPost('/tracking/ping').networkError();

    await expect(postTrackingPingBatch([SAMPLE_PING])).resolves.toEqual({ acknowledged: false });
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
