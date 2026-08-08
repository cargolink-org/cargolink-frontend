import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OtpEntryScreen from '../screens/auth/OtpEntryScreen';

/**
 * AuthStack — Task B.1.
 *
 * Replaces the single placeholder route A.1 mounted under RootSwitch's
 * logged-out branch. Contains exactly the two screens needed for the
 * OTP-first login flow. No role-based branching happens inside this stack;
 * that remains RootSwitch's job once a session exists.
 */
const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="PhoneEntry"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpEntry" component={OtpEntryScreen} />
    </Stack.Navigator>
  );
}
