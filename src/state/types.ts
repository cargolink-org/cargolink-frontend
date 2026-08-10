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

export interface LoadDraft {
  pickupLocation?: string;
  dropoffLocation?: string;
  cargoType?: string;
  weightKg?: number;
  notes?: string;
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
