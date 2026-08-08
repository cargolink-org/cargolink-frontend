/**
 * Shared TypeScript types for CargoLink frontend state layer.
 *
 * NOTE: This file mirrors the shared `types.ts` established in Task A.2
 * (Zustand state management layer). Only the auth-relevant slice is
 * reproduced/extended here for Task B.1; the full type surface (Load,
 * Vehicle, Match, Notification, etc.) lives alongside these in the real
 * repo and is intentionally not duplicated in this delivery.
 */

/** Roles recognized by the platform. Mirrors `users.role` in the DB schema. */
export type UserRole = 'shipper' | 'transporter' | 'admin';

/**
 * Minimal authenticated-user shape returned by `POST /auth/otp/verify`.
 * Field names are a best-guess against the draft OpenAPI shape and are
 * intentionally kept minimal — expand only once the contract freezes
 * (Week 2) to avoid inventing fields the backend doesn't actually return.
 */
export interface AuthUser {
  id: string;
  role: UserRole;
  phone: string;
  name?: string | null;
}

/** Access/refresh token pair, held in-memory only (see authStore). */
export interface SessionTokens {
  token: string;
  refreshToken: string;
}
