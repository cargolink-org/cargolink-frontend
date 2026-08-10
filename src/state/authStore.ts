import { create } from 'zustand';
import * as secureStorage from '../services/secureStorage';
import type { UserRole } from './types';

export interface AuthUser {
  id: string;
  phone: string;
  role?: UserRole;
  name?: string | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  role: UserRole | null;
  isNewUser: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean;
  logoutReason: 'expired' | null;

  hydrate: () => Promise<void>;
  setSession: (token: string, refreshToken: string, user: AuthUser, isNewUser?: boolean) => void;
  setAccessToken: (token: string) => void;
  logout: (reason?: 'expired' | null) => Promise<void>;
  clearSession: () => void;
  clearLogoutReason: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  role: null,
  isNewUser: false,
  isAuthenticated: false,
  isHydrated: false,
  logoutReason: null,

  hydrate: async () => {
    const { token, refreshToken } = await secureStorage.getTokens();
    set({
      token,
      refreshToken,
      isAuthenticated: Boolean(token && refreshToken),
      isHydrated: true,
    });
  },

  setSession: (token, refreshToken, user, isNewUser = false) => {
    set({
      token,
      refreshToken,
      user,
      role: user.role ?? null,
      isNewUser,
      isAuthenticated: true,
      logoutReason: null,
    });
  },

  setAccessToken: (token) => set({ token }),

  logout: async (reason = null) => {
    await secureStorage.clearTokens();
    set({
      token: null,
      refreshToken: null,
      user: null,
      role: null,
      isNewUser: false,
      isAuthenticated: false,
      logoutReason: reason,
    });
  },

  clearSession: () =>
    set({
      token: null,
      refreshToken: null,
      user: null,
      role: null,
      isNewUser: false,
      isAuthenticated: false,
      logoutReason: null,
    }),

  clearLogoutReason: () => set({ logoutReason: null }),
}));
