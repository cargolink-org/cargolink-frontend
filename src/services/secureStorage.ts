import * as SecureStore from 'expo-secure-store';

/**
 * secureStorage.ts
 *
 * The ONLY module in the app allowed to import `expo-secure-store`
 * directly. Everything else — authStore, api/auth.ts, api/client.ts —
 * goes through the functions below.
 *
 * No fallback to AsyncStorage under any circumstance, for either token.
 * Both the access token and refresh token are sensitive per the security
 * checklist, so if SecureStore rejects (e.g. device has no secure
 * enclave / keystore available), callers should surface that as an error,
 * not silently degrade to unencrypted storage.
 */

const ACCESS_TOKEN_KEY = 'cargolink_access_token';
const REFRESH_TOKEN_KEY = 'cargolink_refresh_token';

export interface TokenPair {
  token: string | null;
  refreshToken: string | null;
}

/** Persist a fresh { access, refresh } pair — used after login (verifyOtp). */
export async function saveTokens(token: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

/**
 * Persist only a rotated access token — used after a successful
 * POST /auth/refresh, which (per the current OpenAPI draft) returns just
 * { token } and leaves the refresh token untouched. If the refresh
 * contract later starts rotating the refresh token too, extend this
 * rather than reusing saveTokens with a stale refresh value.
 */
export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

/** Read both tokens. Returns nulls (not throws) when nothing is stored yet. */
export async function getTokens(): Promise<TokenPair> {
  const [token, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  return { token, refreshToken };
}

/** Wipe both tokens — used on explicit logout and on forced (expired-refresh) logout. */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
