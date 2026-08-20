import MockAdapter from 'axios-mock-adapter';

import { apiClient } from './client';
import {
  getQuoteMock,
  getQuoteViaApi,
  isFareQuoteError,
  MOCK_STALE_QUOTE_VEHICLE_ID,
  __resetMockPricingState,
} from './pricing';

jest.mock('../state/authStore', () => ({
  useAuthStore: { getState: () => ({ token: null, refreshToken: null, logout: jest.fn() }) },
}));

describe('getQuoteMock', () => {
  beforeEach(() => {
    __resetMockPricingState();
  });

  it('resolves with a fixed, itemized breakdown for a normal vehicleId', async () => {
    const quote = await getQuoteMock('load-1', 'vehicle-1');
    expect(quote).toEqual({ base_fare: 2500, distance_cost: 1400, surcharge: 300, total: 4200 });
  });

  it('returns the same quote on repeated calls for a normal vehicleId (no drift)', async () => {
    const first = await getQuoteMock('load-1', 'vehicle-1');
    const second = await getQuoteMock('load-1', 'vehicle-1');
    expect(first).toEqual(second);
  });

  it('simulates a price change on the second call for the sentinel stale-quote vehicleId', async () => {
    const first = await getQuoteMock('load-1', MOCK_STALE_QUOTE_VEHICLE_ID);
    const second = await getQuoteMock('load-1', MOCK_STALE_QUOTE_VEHICLE_ID);

    expect(first.total).not.toEqual(second.total);
  });

  it('is independent per loadId:vehicleId key', async () => {
    const loadAFirst = await getQuoteMock('load-A', MOCK_STALE_QUOTE_VEHICLE_ID);
    const loadBFirst = await getQuoteMock('load-B', MOCK_STALE_QUOTE_VEHICLE_ID);
    // Both are "first calls" for their own key, so both should match the
    // stable, as-viewed total rather than one inheriting the other's count.
    expect(loadAFirst.total).toEqual(loadBFirst.total);
  });
});

describe('getQuoteViaApi', () => {
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

  it('requests the quote endpoint with load_id and resolves with the response body', async () => {
    // Assertions must not live inside .reply() — axios-mock-adapter treats
    // a thrown assertion there as a request failure rather than a
    // propagated test failure, which would silently mask this check as an
    // unrelated network/unknown error. Capture and assert afterward.
    let seenParams: unknown;
    mock.onGet('/pricing/quote').reply((config) => {
      seenParams = config.params;
      return [200, { base_fare: 2500, distance_cost: 1400, surcharge: 300, total: 4200 }];
    });

    const quote = await getQuoteViaApi('load-1', 'vehicle-1');

    expect(seenParams).toEqual({ load_id: 'load-1', vehicle_id: 'vehicle-1' });
    expect(quote).toEqual({ base_fare: 2500, distance_cost: 1400, surcharge: 300, total: 4200 });
  });

  it('classifies a response-less failure as a network error', async () => {
    mock.onGet('/pricing/quote').networkError();

    await expect(getQuoteViaApi('load-1', 'vehicle-1')).rejects.toMatchObject({ kind: 'network' });
  });

  it('classifies a server error as unknown', async () => {
    mock.onGet('/pricing/quote').reply(500);

    await expect(getQuoteViaApi('load-1', 'vehicle-1')).rejects.toMatchObject({ kind: 'unknown' });
  });
});

describe('isFareQuoteError', () => {
  it('recognizes a FareQuoteError shape and rejects non-matching values', () => {
    expect(isFareQuoteError({ kind: 'network', message: 'x' })).toBe(true);
    expect(isFareQuoteError(new Error('x'))).toBe(false);
    expect(isFareQuoteError(null)).toBe(false);
  });
});
