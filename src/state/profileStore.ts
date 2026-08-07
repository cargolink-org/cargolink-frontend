// src/state/profileStore.ts
//
// profileStore — the authenticated user's shipper/transporter profile.
// Populated by the future `api/profile.ts` module (Cluster C); never
// calls a network library directly from within this file.

import { create } from 'zustand';
import type { UserProfile } from './types';

interface ProfileState {
  profile: UserProfile;
  isLoadingProfile: boolean;
  profileError: string | null;

  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  setLoadingProfile: (loading: boolean) => void;
  setProfileError: (error: string | null) => void;
}

export const useProfileStore = create<ProfileState>()((set) => ({
  profile: null,
  isLoadingProfile: false,
  profileError: null,

  setProfile: (profile) => set({ profile, profileError: null }),

  clearProfile: () => set({ profile: null, profileError: null, isLoadingProfile: false }),

  setLoadingProfile: (isLoadingProfile) => set({ isLoadingProfile }),

  setProfileError: (profileError) => set({ profileError }),
}));

// Fine-grained selector hooks.
export const useProfile = () => useProfileStore((s) => s.profile);
export const useProfileError = () => useProfileStore((s) => s.profileError);
export const useIsLoadingProfile = () => useProfileStore((s) => s.isLoadingProfile);
