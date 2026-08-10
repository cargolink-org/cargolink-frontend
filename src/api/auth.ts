import axios from 'axios';
import { apiClient } from './client';
import { useAuthStore, AuthUser } from '../state/authStore';
import * as secureStorage from '../services/secureStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

type PhoneArg = string | { phone: string };
type VerifyArg = { phone: string; otp: string };

interface VerifyOtpResponse {
  token: string;
  refresh_token: string;
  user: AuthUser;
  is_new_user?: boolean;
}

function readPhone(arg: PhoneArg): string {
  return typeof arg === 'string' ? arg : arg.phone;
}

export function toSessionTokens(response: VerifyOtpResponse) {
  return {
    token: response.token,
    refreshToken: response.refresh_token,
  };
}

export async function requestOtp(arg: PhoneArg): Promise<void> {
  const phone = readPhone(arg);
  if (MOCK_MODE) return;
  await apiClient.post('/auth/request-otp', { phone });
}

export async function verifyOtp(arg: VerifyArg): Promise<VerifyOtpResponse>;
export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse>;
export async function verifyOtp(arg: VerifyArg | string, otpValue?: string): Promise<VerifyOtpResponse> {
  const payload = typeof arg === 'string' ? { phone: arg, otp: otpValue ?? '' } : arg;
  const response = MOCK_MODE
    ? mockVerifyOtp(payload.phone, payload.otp)
    : (await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', payload)).data;

  await secureStorage.saveTokens(response.token, response.refresh_token);
  useAuthStore
    .getState()
    .setSession(response.token, response.refresh_token, response.user, Boolean(response.is_new_user));

  return response;
}

export async function refreshToken(refreshTokenValue: string): Promise<{ token: string }> {
  if (MOCK_MODE) return mockRefreshToken(refreshTokenValue);

  const response = await axios.post<{ token: string }>(`${BASE_URL}/auth/refresh`, {
    refresh_token: refreshTokenValue,
  });
  return response.data;
}

function mockVerifyOtp(phone: string, _otp: string): VerifyOtpResponse {
  return {
    token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: { id: 'mock-user-1', phone, role: 'shipper' },
    is_new_user: false,
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
