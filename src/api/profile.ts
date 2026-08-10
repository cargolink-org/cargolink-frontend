import { apiClient } from './client';

export type ShipperProfilePayload = {
  role: 'shipper';
  shipperType: 'individual' | 'business';
  name: string;
  gstin?: string;
};

export type TransporterProfilePayload = {
  role: 'transporter';
  licenseNumber: string;
};

export type ProfilePayload = ShipperProfilePayload | TransporterProfilePayload;

export type ShipperProfileResponse = ShipperProfilePayload & {
  id: string;
  updatedAt: string;
};

export type TransporterProfileResponse = TransporterProfilePayload & {
  id: string;
  /** Populated by the backend once the transporter has rated loads; null until then. */
  ratingAvg: number | null;
  updatedAt: string;
};

export type ProfileResponse = ShipperProfileResponse | TransporterProfileResponse;

/**
 * NOTE: the profile endpoint's exact route naming is not yet frozen in the
 * OpenAPI contract (pre-freeze as of Sprint 2). Treated as
 * `PATCH /users/me/profile` per the guide. This module is kept
 * intentionally thin/isolated so that a naming adjustment at contract
 * freeze is a small, localized diff.
 */
const PROFILE_ENDPOINT = '/users/me/profile';

export async function updateProfile(payload: ProfilePayload): Promise<ProfileResponse> {
  const response = await apiClient.patch<ProfileResponse>(PROFILE_ENDPOINT, payload);
  return response.data;
}
