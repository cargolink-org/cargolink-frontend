import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '../state/authStore';
import AdminStack from './AdminStack';
import AuthStack from './AuthStack';
import ShipperStack from './ShipperStack';
import TransporterStack from './TransporterStack';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * SECURITY NOTE: This role switch is a UX convenience only — it is NOT a
 * security boundary. It decides which screens get *mounted* on the client
 * so each person sees the right app, but a compromised or modified client
 * could bypass it entirely. Real authorization is always enforced
 * server-side (see `Depends(require_role(...))` on the API). Never treat
 * "this component mounted AdminStack" as proof the caller is allowed to
 * hit admin endpoints — the API re-checks that independently.
 *
 * RootSwitch itself contains no business logic beyond this switch: it
 * reads `authStore.role` / `isHydrated` and renders one of Auth /
 * ShipperStack / TransporterStack / AdminStack. Anything more belongs in
 * the store or in the stacks themselves.
 */
export function RootSwitch(): React.JSX.Element {
  const { role, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View
        style={styles.splash}
        accessible
        accessibilityLabel="Loading CargoLink"
        accessibilityRole="progressbar"
      >
        <ActivityIndicator size="large" />
        <Text style={styles.splashText}>Loading CargoLink…</Text>
      </View>
    );
  }

  if (__DEV__) {
    // Single dev-only log of which stack was mounted on cold launch.
    // eslint-disable-next-line no-console
    console.log(`[RootSwitch] cold launch -> role="${role ?? 'none'}"`);
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {role === 'shipper' ? (
          <Stack.Screen name="Shipper" component={ShipperStack} />
        ) : role === 'transporter' ? (
          <Stack.Screen name="Transporter" component={TransporterStack} />
        ) : role === 'admin' ? (
          <Stack.Screen name="Admin" component={AdminStack} />
        ) : (
          // No session, or a corrupted/invalid role — always falls through
          // to Auth. This is also what keeps a non-admin from ever
          // reaching AdminStack: only the literal 'admin' branch above
          // mounts it, so any other/unknown role value lands here instead.
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6FA', // neutral placeholder background, not blank white
  },
  splashText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4A4F57',
  },
});

export default RootSwitch;
