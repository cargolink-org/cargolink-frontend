import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ShipperStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ShipperStackParamList, 'MatchResults'>;

/**
 * Placeholder scaffold for Task D.2 (Match-Results Screen), not yet built.
 * Registered now, per D.1's navigation dependency note, only so
 * `LoadPostingScreen`'s post-submit `navigation.navigate('MatchResults', {
 * loadId })` call has a real, typed destination to land on. Displays the
 * `loadId` it received purely to make the D.1 → D.2 handoff visually
 * verifiable during integration; D.2 replaces this entire body with the
 * real ranked-matches list, fare-quote flow, etc.
 */
export default function MatchResultsScreen({ route }: Props) {
  const { loadId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finding matches…</Text>
      <Text style={styles.subtitle} testID="match-results-load-id">
        Load ID: {loadId}
      </Text>
      <Text style={styles.note}>
        This screen is a placeholder — the ranked match list and fare-quote flow ship in Task
        D.2.
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
