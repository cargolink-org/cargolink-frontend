// src/navigation/RootSwitch.tsx
//
// RootSwitch — pure presentational router. Contains no business logic,
// only a branch on the authenticated role.
//
// TASK A.2 CHANGE: previously read a minimal, temporary `authStore` stub
// created in Task A.1. Updated here to consume the fully formalized
// `authStore` from src/state/authStore.ts. The branching logic itself is
// UNCHANGED from A.1 — only the store import changed, per the task's
// "must not regress" requirement.
//
// ASSUMPTION: this file is a reconstruction consistent with A.1's spec
// (splash while unhydrated, switch on role, safe fallback to Auth for any
// missing/invalid role). If your actual A.1 file differs in structure,
// only the `useAuthRole` / `useIsHydrated` import and usage need to be
// applied to your existing file — the rest of this reconstruction is
// illustrative.

import React from 'react';
import { View, Text } from 'react-native';
import { useAuthRole, useIsHydrated } from '../state/authStore';
import AuthStack from './AuthStack';
import ShipperStack from './ShipperStack';
import TransporterStack from './TransporterStack';
import AdminStack from './AdminStack';

export default function RootSwitch() {
  const role = useAuthRole();
  const isHydrated = useIsHydrated();

  if (!isHydrated) {
    // Resolved purely from local storage — no network waterfall before
    // first paint (A.1 performance requirement).
    return <SplashPlaceholder />;
  }

  switch (role) {
    case 'shipper':
      return <ShipperStack />;
    case 'transporter':
      return <TransporterStack />;
    case 'admin':
      return <AdminStack />;
    case null:
    default:
      // Covers "no session" AND any corrupted/invalid role value that
      // somehow reached the store — fail safe to Auth rather than crash.
      return <AuthStack />;
  }
}

function SplashPlaceholder() {
  return (
    <View>
      <Text>Loading…</Text>
    </View>
  );
}
