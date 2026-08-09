import React from 'react';
import { useAuthStore } from '../state/authStore';
// import AppStack from './AppStack';
// import AuthStack from './AuthStack';

/**
 * ASSUMPTION FLAG: illustrative — I don't have A.1's actual RootSwitch.tsx
 * or your AppStack/AuthStack/PhoneEntryScreen components, so the shape
 * here (a component reading two store fields and branching) is a stand-in
 * for the real navigator wiring. Port the logic, not the JSX literally.
 *
 * By the time this mounts, App.tsx has already awaited isHydrated === true
 * (see App.tsx), so isAuthenticated below reflects a real secure-storage
 * read rather than A.1's stub.
 */
export function RootSwitch() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logoutReason = useAuthStore((s) => s.logoutReason);
  const clearLogoutReason = useAuthStore((s) => s.clearLogoutReason);

  if (isAuthenticated) {
    return null; // return <AppStack />;
  }

  // Forced logout (expired refresh token) routes here with a message.
  // clearLogoutReason() should be called once PhoneEntryScreen has read
  // and displayed it, so it doesn't reappear on a later, unrelated visit
  // to this screen.
  const sessionExpiredMessage =
    logoutReason === 'expired' ? 'Your session expired — please sign in again.' : undefined;

  void clearLogoutReason; // wire this call into PhoneEntryScreen's onMount instead of here
  void sessionExpiredMessage;

  return null; // return <AuthStack initialParams={{ sessionExpiredMessage }} />;
}
