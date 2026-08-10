import { create } from 'zustand';

import type {
  ProfileResponse,
  ShipperProfileResponse,
  TransporterProfileResponse,
} from '../api/profile';

type ProfileState = {
  profile: ProfileResponse | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  setProfile: (profile: ProfileResponse) => void;
  setLoadingProfile: (isLoading: boolean) => void;
  setProfileError: (error: string | null) => void;
  clearProfile: () => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoadingProfile: false,
  profileError: null,
  setProfile: (profile) => set({ profile, profileError: null }),
  setLoadingProfile: (isLoadingProfile) => set({ isLoadingProfile }),
  setProfileError: (profileError) => set({ profileError }),
  clearProfile: () => set({ profile: null, profileError: null }),
}));

export const isShipperProfile = (
  profile: ProfileResponse | null
): profile is ShipperProfileResponse => profile?.role === 'shipper';

export const isTransporterProfile = (
  profile: ProfileResponse | null
): profile is TransporterProfileResponse => profile?.role === 'transporter';
