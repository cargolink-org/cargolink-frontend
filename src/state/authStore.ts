import { create } from 'zustand';
import type { AuthUser, SessionTokens, UserRole } from './types';

/**
 * authStore — session/role management.
 *
 * Reproduced here consistent with the store formalized in Task A.2, whose
 * critical, non-negotiable constraint carries forward unchanged:
 *
 *   TOKENS ARE HELD IN MEMORY ONLY. They are never written through any
 *   persistence middleware (no `zustand/persist`, no AsyncStorage). Task
 *   B.2 introduces `expo-secure-store` for cross-restart persistence; until
 *   then (and even after, for the in-memory working copy), this store must
 *   not be the thing that writes tokens to disk.
 *
 * Task B.1 is the first consumer that actually calls `setSession`,
 * `setIsNewUser`, and `setHydrated` from real screen code (Phone/Otp entry).
 */

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  /** True immediately after a first-time `verify` response indicates a new user. */
  isNewUser: boolean;
  /** Gates routing decisions in RootSwitch until an initial session check resolves. */
  isHydrated: boolean;
  /** Last auth-flow error, surfaced by screens; cleared on next attempt. */
  error: string | null;

  setSession: (params: { user: AuthUser; tokens: SessionTokens; isNewUser: boolean }) => void;
  setIsNewUser: (isNewUser: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  setAuthError: (error: string | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  isAuthenticated: false,
  isNewUser: false,
  isHydrated: false,
  error: null,

  setSession: ({ user, tokens, isNewUser }) =>
    set({
      user,
      role: user.role,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isNewUser,
      error: null,
    }),

  setIsNewUser: (isNewUser) => set({ isNewUser }),

  setHydrated: (hydrated) => set({ isHydrated: hydrated }),

  setAuthError: (error) => set({ error }),

  clearSession: () =>
    set({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      isAuthenticated: false,
      isNewUser: false,
      error: null,
    }),
}));

// Fine-grained selector hooks (mirrors the trackingStore convention from A.2
// of preferring selectors over subscribing to the whole store where a screen
// only needs one field).
export const useAuthRole = () => useAuthStore((s) => s.role);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsHydrated = () => useAuthStore((s) => s.isHydrated);
export const useAuthError = () => useAuthStore((s) => s.error);
