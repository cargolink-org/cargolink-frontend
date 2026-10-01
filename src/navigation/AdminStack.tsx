import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AdminStackParamList } from './types';
import { useAuthStore } from '../state/authStore';
import DashboardOverview from '../screens/admin/DashboardOverview';
import RoutesHeatmap from '../screens/admin/RoutesHeatmap';
import RevenueView from '../screens/admin/RevenueView';
import TransporterLeaderboard from '../screens/admin/TransporterLeaderboard';
import { clearAdminCache } from '../screens/admin/useAdminQuery';

/**
 * AdminStack — real implementation (Task G.2; replaces the A.1 placeholder).
 *
 * ROLE GATE: RootSwitch only mounts this for `role === 'admin'` (A.1).
 * This component re-checks the role itself as defence in depth: for any
 * other role it renders nothing, so the four screens — and therefore every
 * `/admin/stats/*` fetch — can never mount, even if this stack is ever
 * rendered from somewhere other than RootSwitch. It also drops the admin
 * data cache once the role is no longer admin (e.g. logout). This is UI
 * hygiene, not a security boundary: the backend enforces role server-side.
 */
const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack(): React.JSX.Element | null {
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      clearAdminCache();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Stack.Navigator initialRouteName="DashboardOverview" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardOverview" component={DashboardOverview} />
      <Stack.Screen name="RoutesHeatmap" component={RoutesHeatmap} />
      <Stack.Screen name="RevenueView" component={RevenueView} />
      <Stack.Screen name="TransporterLeaderboard" component={TransporterLeaderboard} />
    </Stack.Navigator>
  );
}
