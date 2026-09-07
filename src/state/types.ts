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

/**
 * MatchResult — Task D.2 shape.
 *
 * PREVIOUSLY (A.2 scaffold): `{ vehicleId, transporterId, estimatedFare? }`.
 * Replaced here with the actual `GET /loads/{id}/matches` response shape
 * from the technical spec (draft, pending Week 2 freeze). Field names are
 * kept snake_case, matching the wire contract exactly — same convention as
 * `PostLoadPayload`/`PostLoadResponse` in `api/loads.ts` — since
 * `MatchCard`/`FareBreakdown` render these fields directly and a 1:1 match
 * to the contract minimizes mapping-bug risk. No other file in the repo
 * referenced the old shape at the time of this change (verified).
 */
export interface MatchResult {
  vehicle_id: string;
  distance_km: number;
  capacity_fit: boolean;
  /** Human-readable ETA text as returned by the routing/matching engine
   * (e.g. "24 min") — displayed as-is, no client-side date math. */
  eta: string;
  score: number;
}

/** `GET /pricing/quote` response shape (technical spec, draft). */
export interface FareQuote {
  base_fare: number;
  distance_cost: number;
  surcharge: number;
  total: number;
}

/** `POST /loads/{id}/accept` response shape (technical spec, draft). */
export interface AcceptedMatch {
  match_id: string;
  status: string;
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

/**
 * Live-tracking connection state machine (Task E.1). Explicit transitions
 * only — no ad hoc booleans, per the task's architecture requirement:
 * 'connecting' (initial / re-establishing after a room join) -> 'live'
 * (receiving updates normally) -> 'reconnecting' (a disconnect happened,
 * backoff in progress) -> 'lost' (reconnect attempts exhausted).
 *
 * PREVIOUSLY (A.2 scaffold): `'connecting' | 'live' | 'offline' | 'error'`.
 * Replaced with the 4-state machine `sockets.ts`/the task spec actually
 * requires — no other file referenced 'offline'/'error' at the time of
 * this change (verified), so this is a clean replacement, not a migration.
 */
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'lost';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Wire shape of the `location:update` Socket.io event payload (Task E.1,
 * technical spec §2.4) — `lat`/`lng` deliberately NOT `LatLng`'s
 * `latitude`/`longitude` naming, since this mirrors the socket wire
 * contract exactly (same convention as `MatchResult`/`PostLoadPayload`
 * elsewhere: wire shapes keep the backend's field names; `LatLng` is the
 * UI/map-facing shape, converted at the boundary in `TrackingScreen`).
 */
export interface LocationUpdatePayload {
  lat: number;
  lng: number;
  /** ISO8601 timestamp string. */
  ts: string;
}
