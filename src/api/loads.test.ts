import MockAdapter from 'axios-mock-adapter';

import { apiClient } from './client';
import {
  postLoadMock,
  postLoadViaApi,
  buildPostLoadPayload,
  isLoadPostError,
  MOCK_REJECTION_WEIGHT_KG,
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
