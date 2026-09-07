import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TransporterStackParamList } from './types';
import TransporterHomeScreen from '../screens/transporter/TransporterHomeScreen';
import { TransporterProfileScreen } from '../screens/transporter/ProfileScreen';
import VehicleRegistrationScreen from '../screens/transporter/VehicleRegistrationScreen';
import DocumentUploadScreen from '../screens/transporter/DocumentUploadScreen';
import TrackingScreen from '../screens/transporter/TrackingScreen';

/**
 * TransporterStack — built out for real as part of Task E.1.
 *
 * PREVIOUSLY: this file was a raw placeholder `<View>` (never a
 * `Stack.Navigator`, never referencing any of the real transporter
 * screens already built in Clusters C/E) — see README.md's note on the
 * equivalent gap ShipperStack had before D.2. `TransporterProfileScreen`,
 * `VehicleRegistrationScreen`, and `DocumentUploadScreen` all existed as
 * working components with their own passing tests, but nothing actually
 * registered them into a navigator, so none of Cluster C's transporter
 * work was reachable at runtime. Fixed here because Task E.1 explicitly
 * lists this file as one to modify (to register the new Tracking route),
 * and doing that meaningfully requires the stack to be a real navigator
 * first.
 *
 * Mirrors `ShipperStack.tsx`'s structure: a single stack, no nested
 * tab/drawer navigator yet (Cluster H's UI-polish pass is where that
 * would be decided, same as the shipper side).
 */
const Stack = createNativeStackNavigator<TransporterStackParamList>();

export default function TransporterStack() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={TransporterHomeScreen} />
      <Stack.Screen
        name="ProfileScreen"
        component={TransporterProfileScreen}
        options={{ headerShown: true, title: 'Profile' }}
      />
      <Stack.Screen
        name="VehicleRegistration"
        component={VehicleRegistrationScreen}
        options={{ headerShown: true, title: 'Register vehicle' }}
      />
      <Stack.Screen
        name="DocumentUpload"
        component={DocumentUploadScreen}
        options={{ headerShown: true, title: 'Upload documents' }}
      />
      <Stack.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ headerShown: true, title: 'Live trip' }}
      />
    </Stack.Navigator>
  );
}
