// src/state/authStore.ts
//
// authStore — session/role/auth state. This formalizes the minimal stub
// introduced in Task A.1 into its full intended shape. RootSwitch (A.1)
// has been updated to consume this store directly (see navigation/RootSwitch.tsx);
// its branching logic is unchanged from A.1.
//
// SECURITY (see Task A.2 spec, "Security" section):
//   `token` is held in memory only. It is NEVER written to persisted
//   storage. Only `role` and `isNewUser` are persisted below, via an
//   explicit `partialize`. Real token persistence is the exclusive
//   responsibility of `services/secureStorage.ts` (Task B.2) — that
//   service does not exist yet, so nothing in this file should be treated
//   as the source of truth for tokens once B.2 lands.
//
// ASSUMPTION: this file uses @react-native-async-storage/async-storage as
// the persistence backend for the two non-sensitive fields. If your repo
// uses a different storage primitive (MMKV, etc.), swap the `storage`
// option below — the `partialize` contract (never persist `token`) must
// be preserved regardless of backend.

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Role } from './types';

interface AuthState {
  role: Role;
  /** In-memory only — see SECURITY note above. Never persisted. */
  token: string | null;
  isHydrated: boolean;
  isNewUser: boolean;

  setSession: (params: { role: Role; token: string | null; isNewUser?: boolean }) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
  setIsNewUser: (isNewUser: boolean) => void;
}

const initialState = {
  role: null as Role,
  token: null as string | null,
  isHydrated: false,
  isNewUser: false,
};

const asyncStorageAdapter: StateStorage = {
  getItem: async (name) => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return AsyncStorage.getItem(name);
  },
  setItem: async (name, value) => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      setSession: ({ role, token, isNewUser }) =>
        set({
          role,
          token,
          isNewUser: isNewUser ?? false,
        }),

      // Logout: clear everything except isHydrated, which stays true —
      // we've already resolved "no session" and shouldn't re-show splash.
      clearSession: () =>
        set({
          ...initialState,
          isHydrated: true,
        }),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      setIsNewUser: (isNewUser) => set({ isNewUser }),
    }),
    {
      name: 'cargolink-auth-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
      // CRITICAL: only these two non-sensitive fields are ever persisted.
      // `token` is deliberately omitted — see SECURITY note at top of file.
      partialize: (state) => ({
        role: state.role,
        isNewUser: state.isNewUser,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// Fine-grained selector hooks (selective-subscription requirement).
export const useAuthRole = () => useAuthStore((s) => s.role);
export const useAuthToken = () => useAuthStore((s) => s.token);
export const useIsHydrated = () => useAuthStore((s) => s.isHydrated);
export const useIsNewUser = () => useAuthStore((s) => s.isNewUser);
