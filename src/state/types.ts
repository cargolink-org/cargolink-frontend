import type { VehicleType } from '../validation/vehicleSchema';

export type UserRole = 'shipper' | 'transporter' | 'admin';

export interface AuthUser {
  id: string;
  role: UserRole;
  phone: string;
  name?: string | null;
}

export interface SessionTokens {
  token: string;
  refreshToken: string;
}

export type UserProfile = AuthUser | null;

/**
 * Cargo type options captured on the load-posting form (source doc, Module
 * 4.1) — kept as the single source of truth here rather than duplicated as
 * string literals in the form/validation layer.
 */
export const CARGO_TYPES = ['general', 'fragile', 'hazardous', 'refrigerated'] as const;
export type CargoType = (typeof CARGO_TYPES)[number];

/**
 * A structured, geocoded point — what `LocationPicker` returns and what the
 * backend's `GEOGRAPHY(Point, 4326)` columns expect (task D.1). `label` is
 * the human-readable address/place name shown in the UI; it is never sent
 * on its own in place of `lat`/`lng`.
 */
export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

/**
 * LoadDraft — Task D.1 shape.
 *
 * PREVIOUSLY (A.2 scaffold): `{ pickupLocation?: string; dropoffLocation?:
 * string; cargoType?: string; weightKg?: number; notes?: string }`. Replaced
 * here with the structured shape D.1's `POST /loads` contract needs
 * (`source`/`destination` as coordinates, not free text; `deadline` as an
 * ISO8601 timestamp; an explicit `preferredVehicleType`). No other file in
 * the repo referenced the old shape at the time of this change (verified),
 * so this is a clean replacement rather than a migration.
 */
export interface LoadDraft {
  weightKg?: number;
  cargoType?: CargoType;
  source?: GeoPoint;
  destination?: GeoPoint;
  /** ISO8601 timestamp for the pickup deadline. */
  deadline?: string;
  preferredVehicleType?: VehicleType;
}

export interface MatchResult {
  vehicleId: string;
  transporterId: string;
  estimatedFare?: number;
}

export interface FareQuote {
  amount: number;
  currency: string;
}

export interface AcceptedMatch {
  id: string;
  vehicleId: string;
  transporterId: string;
}

export interface ShipmentDocumentsState {
  invoiceUrl?: string;
  ewayBillUrl?: string;
  podUrl?: string;
}

export interface CheckpointsState {
  pickupReached?: boolean;
  loaded?: boolean;
  delivered?: boolean;
}

export interface ContainerState {
  containerNumber?: string;
  sealNumber?: string;
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt?: string;
}

export type ConnectionState = 'connecting' | 'live' | 'offline' | 'error';

export interface LatLng {
  latitude: number;
  longitude: number;
}
