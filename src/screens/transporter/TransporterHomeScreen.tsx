import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { useVehicleStore } from '../../state/vehicleStore';
import type { TransporterStackParamList } from '../../navigation/types';

/**
 * A real "Incoming Loads" screen (where a transporter would normally tap
 * an accepted load to start a trip) doesn't exist yet — it isn't in
 * Cluster E's scope. Per Task E.1's explicit guidance for this exact
 * situation ("if that screen doesn't exist yet, register the tracking
 * screen as directly reachable for now"), this constant stands in for the
 * accepted-load context an "Incoming Loads" tap would normally supply.
 * Replace this with real navigation params once that screen exists.
 */
const DEMO_ACTIVE_LOAD_ID = 'load-demo-001';

export function TransporterHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<TransporterStackParamList>>();
  const registeredVehicleId = useVehicleStore((s) => s.vehicle?.id);

  const handleStartTrip = () => {
    navigation.navigate('Tracking', {
      loadId: DEMO_ACTIVE_LOAD_ID,
      // Falls back to a demo id if no vehicle has been registered yet in
      // this session (e.g. a fresh mock-mode run) — Tracking's history
      // fetch/room-join don't depend on this being a real backend id in
      // MOCK_MODE.
      vehicleId: registeredVehicleId ?? 'vehicle-demo-001',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Transporter Home — Placeholder</Text>
      <Pressable
        style={styles.startTripButton}
        onPress={handleStartTrip}
        accessibilityRole="button"
        testID="start-trip-button"
      >
        <Text style={styles.startTripLabel}>Start trip (dev)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  label: {
    fontSize: 16,
    color: '#1A1D21',
  },
  startTripButton: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  startTripLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TransporterHomeScreen;
