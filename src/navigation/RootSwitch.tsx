import React from 'react';
import { useAuthStore } from '../state/authStore';
import AuthStack from './AuthStack';
import ShipperStack from './ShipperStack';
import TransporterStack from './TransporterStack';
import AdminStack from './AdminStack';

/**
 * RootSwitch — fixed as part of Task E.1.
 *
 * PREVIOUSLY: this component returned `null` in every branch (a leftover
 * from an earlier session that lacked repo access and stubbed the actual
 * `<AppStack />`/`<AuthStack />` JSX as commented-out placeholders — see
 * MIGRATION_NOTES.md). That meant nothing in the app was reachable: every
 * screen built across Clusters A-D existed but could never actually be
 * navigated to from a cold launch. Fixed here because Task E.1's own
 * acceptance criteria depend on the tracking screens being reachable
 * (manual/device testing, the mandatory performance spike) — this isn't
 * new scope, it's an existing gap directly blocking this task's own
 * deliverables.
 *
 * By the time this mounts, App.tsx has already awaited isHydrated === true
 * (see App.tsx), so isAuthenticated/role below reflect a real
 * secure-storage read, not a stub.
 */
export function RootSwitch() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  if (!isAuthenticated) {
    // Forced logout (expired refresh token) is recorded in
    // `authStore.logoutReason` for PhoneEntryScreen to read directly from
    // the store and clear once displayed — kept out of RootSwitch since
    // AuthStack's param list has no route for it and this component has
    // no business owning that display logic.
    return <AuthStack />;
  }

  switch (role) {
    case 'shipper':
      return <ShipperStack />;
    case 'transporter':
      return <TransporterStack />;
    case 'admin':
      return <AdminStack />;
    default:
      // Authenticated but no (or an invalid) role on the session object —
      // treat as logged out rather than crash or render a blank screen.
      return <AuthStack />;
  }
}

export default RootSwitch;
