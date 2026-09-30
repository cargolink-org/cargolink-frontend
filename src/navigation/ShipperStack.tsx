import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ShipperStackParamList } from './types';
import { ShipperHomeScreen } from '../screens/shipper/ShipperHomeScreen';
import { ShipperProfileScreen } from '../screens/shipper/ProfileScreen';
import LoadPostingScreen from '../screens/shipper/LoadPostingScreen';
import MatchResultsScreen from '../screens/shipper/MatchResultsScreen';
import FareQuoteScreen from '../screens/shipper/FareQuoteScreen';
import TrackingScreen from '../screens/shipper/TrackingScreen';
import DocumentChecklistScreen from '../screens/shared/DocumentChecklistScreen';
import CheckpointTimelineScreen from '../screens/shared/CheckpointTimelineScreen';
import ContainerDetailsScreen from '../screens/shared/ContainerDetailsScreen';
import NotificationInboxScreen from '../screens/shared/NotificationInboxScreen';
import NotificationPreferencesScreen from '../screens/shared/NotificationPreferencesScreen';
import RatingScreen from '../screens/shipper/RatingScreen';

/**
 * ShipperStack — real implementation (task D.1, extended by D.2).
 *
 * Replaces the placeholder `<View>` carried over from A.1. `Home` and
 * `ProfileScreen` already had real screen components (C.1) that this stack
 * was never actually updated to register — folded in here alongside D.1's
 * own `LoadPosting`/`MatchResults` routes, since both gaps live in the same
 * file and D.1 needs a working stack to navigate within regardless.
 * D.2 adds `FareQuoteScreen` (real) and `Tracking` (Cluster E stub, same
 * placeholder pattern D.1 used for `MatchResults`).
 */
const Stack = createNativeStackNavigator<ShipperStackParamList>();

export default function ShipperStack() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={ShipperHomeScreen} />
      <Stack.Screen
        name="ProfileScreen"
        component={ShipperProfileScreen}
        options={{ headerShown: true, title: 'Profile' }}
      />
      <Stack.Screen
        name="LoadPosting"
        component={LoadPostingScreen}
        options={{ headerShown: true, title: 'Post a load' }}
      />
      <Stack.Screen
        name="MatchResults"
        component={MatchResultsScreen}
        options={{ headerShown: true, title: 'Matches' }}
      />
      <Stack.Screen
        name="FareQuoteScreen"
        component={FareQuoteScreen}
        options={{ headerShown: true, title: 'Fare quote' }}
      />
      <Stack.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ headerShown: true, title: 'Track shipment' }}
      />
      {/* Task F.1 — shared screens, identical registration on both role
          stacks (see TransporterStack.tsx). */}
      <Stack.Screen
        name="DocumentChecklist"
        component={DocumentChecklistScreen}
        options={{ headerShown: true, title: 'Documents' }}
      />
      <Stack.Screen
        name="CheckpointTimeline"
        component={CheckpointTimelineScreen}
        options={{ headerShown: true, title: 'Checkpoint status' }}
      />
      <Stack.Screen
        name="ContainerDetails"
        component={ContainerDetailsScreen}
        options={{ headerShown: true, title: 'Container details' }}
      />
      {/* Task F.2 — shared screens, identical registration on both role
          stacks (see TransporterStack.tsx). */}
      <Stack.Screen
        name="NotificationInbox"
        component={NotificationInboxScreen}
        options={{ headerShown: true, title: 'Notifications' }}
      />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ headerShown: true, title: 'Notification preferences' }}
      />
      {/* Task G.1 — role-specific (not shared with TransporterStack): the
          shipper rates the transporter here, the transporter rates the
          shipper on the symmetrical route below. */}
      <Stack.Screen
        name="Rating"
        component={RatingScreen}
        options={{ headerShown: true, title: 'Rate this trip' }}
      />
    </Stack.Navigator>
  );
}
