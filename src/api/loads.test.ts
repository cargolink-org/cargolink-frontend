import MockAdapter from 'axios-mock-adapter';

import { apiClient } from './client';
import {
  postLoadMock,
  postLoadViaApi,
  buildPostLoadPayload,
  isLoadPostError,
  MOCK_REJECTION_WEIGHT_KG,
  getMatchesMock,
  getMatchesViaApi,
  isGetMatchesError,
  MOCK_EMPTY_MATCHES_LOAD_ID,
  MOCK_CONFLICT_VEHICLE_ID,
  acceptMatchMock,
  acceptMatchViaApi,
  isAcceptMatchError,
  type LoadPostError,
} from './loads';
import type { LoadFormValues } from '../validation/loadSchema';

jest.mock('../state/authStore', () => ({
  useAuthStore: { getState: () => ({ token: null, refreshToken: null, logout: jest.fn() }) },
}));

const futureDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString();

const validValues: LoadFormValues = {
  weightKg: 1500,
  cargoType: 'general',
  source: { lat: 18.5204, lng: 73.8567, label: 'Pune, Maharashtra' },
  destination: { lat: 19.076, lng: 72.8777, label: 'Mumbai, Maharashtra' },
  deadline: futureDeadline,
  preferredVehicleType: 'truck',
};

describe('buildPostLoadPayload', () => {
  it('maps form values to the backend request shape (structured coordinates, no free text)', () => {
    const payload = buildPostLoadPayload(validValues);
    expect(payload).toEqual({
      weight: 1500,
      cargo_type: 'general',
      source: { lat: 18.5204, lng: 73.8567 },
      destination: { lat: 19.076, lng: 72.8777 },
      deadline: futureDeadline,
      preferred_vehicle_type: 'truck',
    });
    // Labels must never leak into the API payload — only lat/lng.
    expect(payload.source).not.toHaveProperty('label');
  });
});

// Tests `postLoadMock`/`postLoadViaApi` directly rather than the
// `EXPO_PUBLIC_MOCK_MODE`-gated `postLoad` dispatcher — `EXPO_PUBLIC_*` env
// vars are inlined to literals at babel transform time by
// `babel-preset-expo`, so mutating `process.env` at test runtime can't
// change which branch `postLoad` takes. See the note on `postLoadViaApi` in
// loads.ts.
describe('postLoadMock', () => {
  it('resolves with a load_id and status for a normal payload', async () => {
    const response = await postLoadMock(validValues);
    expect(response.load_id).toMatch(/^mock-load-/);
    expect(response.status).toBe('posted');
  });

  it('simulates a server-side rejection for the sentinel test weight', async () => {
    await expect(
      postLoadMock({ ...validValues, weightKg: MOCK_REJECTION_WEIGHT_KG })
    ).rejects.toMatchObject({
      kind: 'validation',
      message: expect.stringMatching(/corridor/i),
    });
  });
});

describe('postLoadViaApi', () => {
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

  it('posts the mapped payload and resolves with the response body', async () => {
    mock.onPost('/loads').reply((config) => {
      expect(JSON.parse(config.data)).toEqual(buildPostLoadPayload(validValues));
      return [201, { load_id: 'load-123', status: 'posted' }];
    });

    const response = await postLoadViaApi(validValues);
    expect(response).toEqual({ load_id: 'load-123', status: 'posted' });
  });

  it('classifies a response-less failure as a network error', async () => {
    mock.onPost('/loads').networkError();

    await expect(postLoadViaApi(validValues)).rejects.toMatchObject({
      kind: 'network',
    } satisfies Partial<LoadPostError>);
  });

  it('classifies a 4xx response as a validation error and surfaces the server message', async () => {
    mock.onPost('/loads').reply(422, { message: 'No transporters service this corridor.' });

    await expect(postLoadViaApi(validValues)).rejects.toMatchObject({
      kind: 'validation',
      message: 'No transporters service this corridor.',
    });
  });

  it('falls back to a generic message when the server sends no message', async () => {
    mock.onPost('/loads').reply(422, {});

    await expect(postLoadViaApi(validValues)).rejects.toMatchObject({
      kind: 'validation',
      message: expect.stringMatching(/could not be posted/i),
    });
  });
});

describe('isLoadPostError', () => {
  it('recognizes a LoadPostError shape', () => {
    expect(isLoadPostError({ kind: 'network', message: 'x' })).toBe(true);
  });

  it('rejects a plain Error', () => {
    expect(isLoadPostError(new Error('x'))).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isLoadPostError(null)).toBe(false);
    expect(isLoadPostError(undefined)).toBe(false);
  });
});

// --- Task D.2: GET /loads/{id}/matches -------------------------------

describe('getMatchesMock', () => {
  it('resolves with a non-empty, score-varied list for a normal loadId', async () => {
    const results = await getMatchesMock('load-1');
    expect(results.length).toBeGreaterThan(1);
    expect(results.every((m) => typeof m.vehicle_id === 'string')).toBe(true);
  });

  it('resolves with an empty array for the sentinel empty-matches loadId', async () => {
    const results = await getMatchesMock(MOCK_EMPTY_MATCHES_LOAD_ID);
    expect(results).toEqual([]);
  });
});

describe('getMatchesViaApi', () => {
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

  it('requests the matches endpoint with query params and resolves with the response body', async () => {
    // Assertions must not live inside the .reply() callback — axios-mock-
    // adapter treats a thrown assertion there as a request failure, not a
    // propagated test failure, which would otherwise silently mask this
    // check as an unrelated "could not load matches" error. Capture the
    // config and assert on it afterward instead.
    let seenParams: unknown;
    mock.onGet('/loads/load-1/matches').reply((config) => {
      seenParams = config.params;
      return [200, [{ vehicle_id: 'v1', distance_km: 5, capacity_fit: true, eta: '10 min', score: 0.9 }]];
    });

    const results = await getMatchesViaApi('load-1', { radiusKm: 50, limit: 10 });

    expect(seenParams).toEqual({ radius_km: 50, limit: 10 });
    expect(results).toEqual([
      { vehicle_id: 'v1', distance_km: 5, capacity_fit: true, eta: '10 min', score: 0.9 },
    ]);
  });

  it('classifies a response-less failure as a network error', async () => {
    mock.onGet('/loads/load-1/matches').networkError();

    await expect(getMatchesViaApi('load-1')).rejects.toMatchObject({ kind: 'network' });
  });

  it('classifies any server-side failure as unknown (no partial-data guessing)', async () => {
    mock.onGet('/loads/load-1/matches').reply(500);

    await expect(getMatchesViaApi('load-1')).rejects.toMatchObject({ kind: 'unknown' });
  });
});

describe('isGetMatchesError', () => {
  it('recognizes a GetMatchesError shape and rejects non-matching values', () => {
    expect(isGetMatchesError({ kind: 'network', message: 'x' })).toBe(true);
    expect(isGetMatchesError(new Error('x'))).toBe(false);
    expect(isGetMatchesError(null)).toBe(false);
  });
});

// --- Task D.2: POST /loads/{id}/accept --------------------------------

describe('acceptMatchMock', () => {
  it('resolves with a match_id and accepted status for a normal vehicleId', async () => {
    const response = await acceptMatchMock('load-1', 'vehicle-1');
    expect(response.match_id).toMatch(/^mock-match-/);
    expect(response.status).toBe('accepted');
  });

  it('rejects with a conflict error for the sentinel conflict vehicleId', async () => {
    await expect(acceptMatchMock('load-1', MOCK_CONFLICT_VEHICLE_ID)).rejects.toMatchObject({
      kind: 'conflict',
      message: expect.stringMatching(/no longer available/i),
    });
  });
});

describe('acceptMatchViaApi', () => {
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

  it('posts vehicle_id and resolves with the response body', async () => {
    // See the note on getMatchesViaApi's test above — assertions must not
    // live inside .reply(), so the request body is captured and checked
    // afterward instead.
    let seenBody: unknown;
    mock.onPost('/loads/load-1/accept').reply((config) => {
      seenBody = JSON.parse(config.data);
      return [200, { match_id: 'match-1', status: 'accepted' }];
    });

    const response = await acceptMatchViaApi('load-1', 'vehicle-1');

    expect(seenBody).toEqual({ vehicle_id: 'vehicle-1' });
    expect(response).toEqual({ match_id: 'match-1', status: 'accepted' });
  });

  it('classifies a 409 response as a conflict and surfaces the server message', async () => {
    mock.onPost('/loads/load-1/accept').reply(409, { message: 'Already taken by another shipper.' });

    await expect(acceptMatchViaApi('load-1', 'vehicle-1')).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Already taken by another shipper.',
    });
  });

  it('classifies a response-less failure as a network error', async () => {
    mock.onPost('/loads/load-1/accept').networkError();

    await expect(acceptMatchViaApi('load-1', 'vehicle-1')).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('classifies a non-409 server error as unknown', async () => {
    mock.onPost('/loads/load-1/accept').reply(500, {});

    await expect(acceptMatchViaApi('load-1', 'vehicle-1')).rejects.toMatchObject({
      kind: 'unknown',
    });
  });
});

describe('isAcceptMatchError', () => {
  it('recognizes an AcceptMatchError shape and rejects non-matching values', () => {
    expect(isAcceptMatchError({ kind: 'conflict', message: 'x' })).toBe(true);
    expect(isAcceptMatchError(new Error('x'))).toBe(false);
    expect(isAcceptMatchError(undefined)).toBe(false);
  });
});
