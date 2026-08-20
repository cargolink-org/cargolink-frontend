/**
 * Typed navigation param lists.
 *
 * This extends the navigation types established in Task A.1 with the Auth
 * stack's two real screens (Task B.1). `RootStackParamList` /
 * `ShipperStackParamList` / `TransporterStackParamList` /
 * `AdminStackParamList` are assumed to already exist from A.1 and are not
 * redefined here to avoid clobbering that work — only the Auth-specific
 * additions are shown.
 */

export type AuthStackParamList = {
  PhoneEntry: undefined;
  /** OTP screen requires the phone number it's verifying an OTP for. */
  OtpEntry: { phone: string };
};

/**
 * Root-level param list. `Auth` now points at the real `AuthStackParamList`
 * (previously a single placeholder route in A.1). `Shipper`/`Transporter`/
 * `Admin` remain screen-stack entry points owned by later clusters.
 */
export type RootStackParamList = {
  Auth: undefined;
  Shipper: undefined;
  Transporter: undefined;
  Admin: undefined;
};

/**
 * Shared by both role stacks' `ProfileScreen` route (task C.1, documented in
 * MIGRATION_NOTES.md). `mode` is optional by design — screens fall back to
 * `authStore.isNewUser` when it's omitted (e.g. when B.1 navigates in
 * without explicit params).
 */
export type ProfileScreenParams = { mode?: 'create' | 'edit' } | undefined;

/**
 * ShipperStackParamList — was missing entirely even though
 * `screens/shipper/ProfileScreen.tsx` (C.1) already imported it; added here
 * as part of task D.1 alongside `LoadPosting`/`MatchResults`, since both
 * gaps block the same file from compiling.
 */
export type ShipperStackParamList = {
  Home: undefined;
  ProfileScreen: ProfileScreenParams;
  /** Task D.1 — no params; reads the shipper's existing profile from profileStore. */
  LoadPosting: undefined;
  /** Task D.2 — needs the load_id returned by `POST /loads` to know which
   * load's matches to fetch. */
  MatchResults: { loadId: string };
  /** Task D.2 — needs both the load and the specific vehicle selected from
   * MatchResultsScreen to fetch the right fare quote. */
  FareQuoteScreen: { loadId: string; vehicleId: string };
  /** Stub target for Cluster E (live tracking), registered now per D.2's
   * navigation dependency note — same pattern D.1 used for MatchResults. */
  Tracking: { loadId: string };
};

/**
 * TransporterStackParamList — likewise referenced (task C.2) but never
 * defined. Added here purely as a type declaration so the existing
 * `VehicleRegistrationScreen.tsx` / `DocumentUploadScreen.tsx` /
 * `screens/transporter/ProfileScreen.tsx` compile; wiring `TransporterStack.tsx`
 * itself to a real navigator is outside D.1's scope (Cluster C's task, not
 * touched here).
 */
export type TransporterStackParamList = {
  Home: undefined;
  ProfileScreen: ProfileScreenParams;
  VehicleRegistration: undefined;
  DocumentUpload: undefined;
};
