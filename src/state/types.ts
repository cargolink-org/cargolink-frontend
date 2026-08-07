// src/state/types.ts
//
// Shared TypeScript types used across CargoLink Frontend state stores.
// Centralized here (per Task A.2's code-quality requirement) so no store
// redeclares the same shape independently.

/** The three authenticated roles the app supports, plus null for logged-out. */
export type Role = 'shipper' | 'transporter' | 'admin' | null;

/** Connection lifecycle for the live Socket.io tracking stream (Cluster E). */
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'lost';

/** Minimal lat/lng pair used for live tracking positions. */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Shipper-specific profile fields, per the source documentation
 * (company/individual profile, GSTIN/business registration if applicable).
 * Exact wire shape will be reconciled against the OpenAPI contract at the
 * Week 2 freeze — this is a reasonable pre-freeze scaffold, not final.
 */
export interface ShipperProfile {
  kind: 'shipper';
  userId: string;
  companyName: string;
  gstin?: string;
}

/**
 * Transporter-specific profile fields, per the source documentation
 * (license number, aggregate rating).
 */
export interface TransporterProfile {
  kind: 'transporter';
  userId: string;
  licenseNo: string;
  ratingAvg: number;
}

export type UserProfile = ShipperProfile | TransporterProfile | null;

/** A single matched vehicle for a posted load (Cluster D shape, pre-freeze). */
export interface MatchResult {
  vehicleId: string;
  distanceKm: number;
  capacityFit: boolean;
  eta: string;
  score: number;
}

/** Fare breakdown returned by the pricing endpoint (pre-freeze shape). */
export interface FareQuote {
  baseFare: number;
  distanceCost: number;
  surcharge: number;
  total: number;
}

/** A load's in-progress draft — pure UI/form state, NOT server-derived. */
export interface LoadDraft {
  weight?: number;
  cargoType?: 'general' | 'fragile' | 'hazardous' | 'refrigerated';
  source?: LatLng;
  destination?: LatLng;
  deadline?: string;
  preferredVehicleType?: string;
}

/** Accepted match summary once a shipper accepts a transporter. */
export interface AcceptedMatch {
  matchId: string;
  status: string;
  vehicleId: string;
}

/** Placeholder shipment-document sub-state, filled out in Cluster F. */
export interface ShipmentDocumentsState {
  [loadId: string]: Array<{ docType: string; status: string; fileUrl?: string }>;
}

/** Placeholder checkpoint sub-state, filled out in Cluster F. */
export interface CheckpointsState {
  [loadId: string]: Array<{ checkpointName: string; status: string; timestamp: string }>;
}

/** Placeholder container sub-state, filled out in Cluster F. */
export interface ContainerState {
  [loadId: string]: {
    containerNo: string;
    vesselOrFlight: string;
    portOfLoading: string;
    portOfDischarge: string;
  } | null;
}

/** A single in-app notification (mirrors the `notifications` DB table). */
export interface Notification {
  id: string;
  type: string;
  message: string;
  sentAt: string;
  read: boolean;
}
