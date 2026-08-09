import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../state/authStore';
import * as secureStorage from '../services/secureStorage';
import { refreshToken as requestTokenRefresh } from './auth';

// NOTE: this file and auth.ts import from each other (client.ts needs
// auth.ts's refreshToken() for the 401 handler; auth.ts needs apiClient
// from here for its own calls). That's a circular import, but it's safe
// because neither side calls the other at module-evaluation time — only
// inside functions invoked later, by which point both modules are fully
// loaded.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// --- Request interceptor: attach the access token to every call ---
// Reads from authStore's in-memory cache (kept in sync with secure storage
// by hydrate/setSession/setAccessToken/logout) rather than hitting
// SecureStore on every request, since SecureStore reads are async and
// this needs to stay synchronous.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: on 401, refresh once and retry ---
//
// Several requests can 401 at nearly the same moment (a screen firing a
// few parallel calls right as the ~15min access token expires). Without
// de-duplication, each would kick off its own /auth/refresh, racing to
// rotate the token and stepping on each other. `refreshPromise` ensures
// only the first 401 starts a refresh; every other concurrent 401 awaits
// that same in-flight promise instead of starting a new one.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const { refreshToken, logout } = useAuthStore.getState();

  if (!refreshToken) {
    await logout('expired');
    throw new Error('No refresh token available — logged out.');
  }

  try {
    const { token: newAccessToken } = await requestTokenRefresh(refreshToken);
    await secureStorage.saveAccessToken(newAccessToken);
    useAuthStore.getState().setAccessToken(newAccessToken);
    return newAccessToken;
  } catch (err) {
    // The refresh token itself was rejected (expired/revoked) — this is
    // the forced-logout path. Route to Auth stack with a "session
    // expired" message via authStore.logoutReason (read by RootSwitch).
    await logout('expired');
    throw err;
  }
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    const isUnauthorized = error.response?.status === 401;
    const alreadyRetried = originalRequest?._retry === true;

    if (!isUnauthorized || !originalRequest || alreadyRetried) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      originalRequest.headers = originalRequest.headers ?? ({} as InternalAxiosRequestConfig['headers']);
      (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);
