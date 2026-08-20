import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ShipperStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ShipperStackParamList, 'Tracking'>;

/**
 * Placeholder scaffold for Cluster E (Live Tracking & Background Location),
 * not yet built. Registered now, per Task D.2's navigation dependency
 * note, only so FareQuoteScreen's post-accept
 * `navigation.navigate('Tracking', { loadId })` call has a real, typed
 * destination to land on — the same pattern D.1 used for the
 * MatchResults stub. Displays the `loadId` purely to make the D.2 -> E
 * handoff visually verifiable during integration; Cluster E replaces this
 * entire body with the real `@rnmapbox/maps` live-tracking UI.
 */
export default function TrackingScreen({ route }: Props) {
  const { loadId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match accepted!</Text>
      <Text style={styles.subtitle} testID="tracking-load-id">
        Load ID: {loadId}
      </Text>
      <Text style={styles.note}>
        This screen is a placeholder — live GPS tracking with @rnmapbox/maps ships in Cluster E.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#5B6270', marginBottom: 16 },
  note: { fontSize: 12, color: '#9AA1AC', textAlign: 'center' },
});
