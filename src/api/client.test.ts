import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/state/authStore';
import * as authApi from '../../src/api/auth';

// npm install --save-dev axios-mock-adapter, if not already present.

jest.mock('../../src/api/auth', () => ({
  ...jest.requireActual('../../src/api/auth'),
  refreshToken: jest.fn(),
}));

jest.mock('../../src/services/secureStorage', () => ({
  saveAccessToken: jest.fn().mockResolvedValue(undefined),
  saveTokens: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
  getTokens: jest.fn().mockResolvedValue({ token: null, refreshToken: null }),
}));

describe('apiClient 401 handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    useAuthStore.setState({
      token: 'expired-access',
      refreshToken: 'valid-refresh',
      user: { id: 'u1', phone: '+911234567890' },
      isAuthenticated: true,
      isHydrated: true,
      logoutReason: null,
    });
  });

  afterEach(() => {
    mock.reset();
    jest.clearAllMocks();
  });

  it('de-duplicates concurrent 401s into a single refresh call, then retries all of them', async () => {
    (authApi.refreshToken as jest.Mock).mockResolvedValue({ token: 'new-access' });

    mock.onGet('/loads').reply((config) => {
      const retried = (config.headers as Record<string, string> | undefined)?.Authorization === 'Bearer new-access';
      return retried ? [200, { ok: true }] : [401, { message: 'expired' }];
    });

    const results = await Promise.all([
      apiClient.get('/loads'),
      apiClient.get('/loads'),
      apiClient.get('/loads'),
    ]);

    expect(authApi.refreshToken).toHaveBeenCalledTimes(1);
    results.forEach((r) => expect(r.data).toEqual({ ok: true }));
    expect(useAuthStore.getState().token).toBe('new-access');
  });

  it('forces logout when the refresh token itself is rejected', async () => {
    const rejection = Object.assign(new Error('refresh rejected'), {
      response: { status: 401 },
    });
    (authApi.refreshToken as jest.Mock).mockRejectedValue(rejection);
    mock.onGet('/loads').reply(401, { message: 'expired' });

    await expect(apiClient.get('/loads')).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.logoutReason).toBe('expired');
  });

  it('does not retry a request more than once even if the retried call is also 401', async () => {
    (authApi.refreshToken as jest.Mock).mockResolvedValue({ token: 'new-access' });
    mock.onGet('/loads').reply(401, { message: 'still expired' });

    await expect(apiClient.get('/loads')).rejects.toThrow();
    expect(authApi.refreshToken).toHaveBeenCalledTimes(1);
  });
});
