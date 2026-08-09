import { create } from 'zustand';
import * as secureStorage from '../services/secureStorage';

/**
 * ASSUMPTION FLAG: I don't have A.2's actual authStore.ts, so this assumes
 * zustand (chosen because api/client.ts's interceptors run outside the
 * React tree and need a synchronous getState() — the cleanest fit without
 * extra wiring). If A.2 actually used Redux/Context/something else, port
 * the fields and actions below onto that instead of swapping libraries.
 */

export interface AuthUser {
  id: string;
  phone: string;
  // extend with whatever B.1/A.2 actually put on the user object
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True once secureStorage has been checked on boot. RootSwitch's cold-launch check gates on this. */
  isHydrated: boolean;
  /** Set when logout() was forced by an expired refresh token, so the Auth stack can show a message. */
  logoutReason: 'expired' | null;

  hydrate: () => Promise<void>;
  setSession: (token: string, refreshToken: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  logout: (reason?: 'expired' | null) => Promise<void>;
  clearLogoutReason: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  logoutReason: null,

  // Called once, as early as possible in App.tsx. Replaces A.1's stubbed
  // session check with a real read from secure storage.
  hydrate: async () => {
    const { token, refreshToken } = await secureStorage.getTokens();
    set({
      token,
      refreshToken,
      isAuthenticated: Boolean(token && refreshToken),
      isHydrated: true,
    });
  },

  // Called from auth.ts's verifyOtp() on successful login, AFTER tokens
  // have already been written to secure storage.
  setSession: (token, refreshToken, user) => {
    set({ token, refreshToken, user, isAuthenticated: true, logoutReason: null });
  },

  // Called after a successful POST /auth/refresh — only the access token changes.
  setAccessToken: (token) => set({ token }),

  // Clears secure storage AND in-memory state. Used both for a normal
  // user-initiated logout and for the forced logout on refresh failure.
  logout: async (reason = null) => {
    await secureStorage.clearTokens();
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      logoutReason: reason,
    });
  },

  clearLogoutReason: () => set({ logoutReason: null }),
}));
