import type { NavigatorScreenParams } from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Auth Stack
// ---------------------------------------------------------------------------
export type AuthStackParamList = {
  AuthPlaceholder: undefined;
};

// ---------------------------------------------------------------------------
// Shipper Stack
// Shippers post cargo and need visibility into matching/tracking/documents.
// Later clusters add more tabs here (e.g. PostCargo, Tracking, Documents).
// ---------------------------------------------------------------------------
export type ShipperStackParamList = {
  ShipperHome: undefined;
};

// ---------------------------------------------------------------------------
// Transporter Stack
// Transporters accept loads, upload compliance documents, stream location.
// Later clusters add more tabs here (e.g. Loads, Compliance, LiveTracking).
// ---------------------------------------------------------------------------
export type TransporterStackParamList = {
  TransporterHome: undefined;
};

// ---------------------------------------------------------------------------
// Admin Stack — reachable only when authStore.role === 'admin'
// ---------------------------------------------------------------------------
export type AdminStackParamList = {
  AdminHome: undefined;
};

// ---------------------------------------------------------------------------
// Root
// RootSwitch mounts exactly one of these at a time, based on authStore.role.
// ---------------------------------------------------------------------------
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Shipper: NavigatorScreenParams<ShipperStackParamList>;
  Transporter: NavigatorScreenParams<TransporterStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

// Lets every useNavigation()/navigate() call in the app be typed against
// RootStackParamList without re-importing it everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
