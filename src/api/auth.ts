import axios from 'axios';
import { apiClient } from './client';
import { useAuthStore, AuthUser } from '../state/authStore';
import * as secureStorage from '../services/secureStorage';

/**
 * ASSUMPTION FLAG: I don't have B.1's actual auth.ts, so requestOtp() and
 * the request/response shape of verifyOtp() below are illustrative. The
 * part that matters for B.2 — persist-then-update-store, and the new
 * refreshToken() function — is the real deliverable; reconcile the rest
 * against your actual B.1 file.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

interface VerifyOtpResponse {
  token: string;
  refresh_token: string;
  user: AuthUser;
}

export async function requestOtp(phone: string): Promise<void> {
  if (MOCK_MODE) return; // mock path per B.1 — wire to your actual mock fixtures
  await apiClient.post('/auth/request-otp', { phone });
}

export async function verifyOtp(phone: string, otp: string): Promise<{ user: AuthUser }> {
  const { token, refresh_token, user } = MOCK_MODE
    ? mockVerifyOtp(phone, otp)
    : (await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', { phone, otp })).data;

  // B.2: persist to secure storage BEFORE updating in-memory state — this
  // resolves B.1's TODO (previously authStore was updated directly with
  // no persistence).
  await secureStorage.saveTokens(token, refresh_token);
  useAuthStore.getState().setSession(token, refresh_token, user);

  return { user };
}

/**
 * Rotates the access token using the current refresh token.
 *
 * Deliberately calls a bare axios instance rather than `apiClient` — this
 * avoids recursing into apiClient's own 401 response interceptor if the
 * refresh call itself comes back 401 (expired/revoked refresh token).
 */
export async function refreshToken(refreshTokenValue: string): Promise<{ token: string }> {
  if (MOCK_MODE) return mockRefreshToken(refreshTokenValue);

  const response = await axios.post<{ token: string }>(`${BASE_URL}/auth/refresh`, {
    refresh_token: refreshTokenValue,
  });
  return response.data;
}

// --- Mock-mode fixtures ---
// Placeholder mocks so refresh/401 logic is testable without a backend.
// Replace with however B.1 actually wired MOCK_MODE (msw handlers, a mock
// adapter, hand-rolled fixtures, etc.) — this is a stand-in, not a copy of
// the real thing.

function mockVerifyOtp(_phone: string, _otp: string): VerifyOtpResponse {
  return {
    token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: { id: 'mock-user-1', phone: _phone },
  };
}

function mockRefreshToken(refreshTokenValue: string): { token: string } {
  if (refreshTokenValue === 'mock-refresh-token-expired') {
    const err = new Error('Refresh token expired') as Error & { response?: { status: number } };
    err.response = { status: 401 };
    throw err;
  }
  return { token: `mock-access-token-rotated-${Date.now()}` };
}
