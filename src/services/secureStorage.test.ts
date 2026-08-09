import * as SecureStore from 'expo-secure-store';
import {
  saveTokens,
  saveAccessToken,
  getTokens,
  clearTokens,
} from '../../src/services/secureStorage';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('secureStorage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('saveTokens writes both the access and refresh token', async () => {
    await saveTokens('access-1', 'refresh-1');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cargolink_access_token', 'access-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cargolink_refresh_token', 'refresh-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
  });

  it('saveAccessToken only touches the access token key', async () => {
    await saveAccessToken('new-access');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cargolink_access_token', 'new-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it('getTokens returns both values when present', async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('stored-access')
      .mockResolvedValueOnce('stored-refresh');

    const result = await getTokens();

    expect(result).toEqual({ token: 'stored-access', refreshToken: 'stored-refresh' });
  });

  it('getTokens returns nulls (not a throw) when nothing is stored yet', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const result = await getTokens();

    expect(result).toEqual({ token: null, refreshToken: null });
  });

  it('clearTokens removes both keys', async () => {
    await clearTokens();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cargolink_access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cargolink_refresh_token');
  });
});
