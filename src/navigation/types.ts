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
