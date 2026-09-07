import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface EtaBadgeProps {
  /**
   * Human-readable ETA text as originally returned by the matching
   * engine (`GET /loads/{id}/matches`'s `eta` field, e.g. "12 min") and
   * threaded forward through FareQuoteScreen's accept flow. This task's
   * API contract has no live-recomputing ETA endpoint to call as the
   * vehicle moves — `GET /tracking/{vehicleId}` only returns position
   * history — so this badge shows the most recently known ETA rather
   * than synthesizing a distance/time estimate client-side, which would
   * duplicate backend routing logic the app has no business owning.
   * `null` renders a neutral "Calculating..." state instead of a blank
   * badge or a fabricated number.
   */
  etaLabel: string | null;
  testID?: string;
}

/**
 * Standalone, prop-driven ETA display (Task E.1). Kept separate from
 * `TrackingScreen` per the guide's component-architecture convention
 * (MatchCard/FareBreakdown precedent) and so it can be selector-subscribed
 * independently — an ETA badge re-render is much cheaper than the map's,
 * and shouldn't be coupled to it.
 */
export function EtaBadge({ etaLabel, testID = 'eta-badge' }: EtaBadgeProps) {
  const label = etaLabel ? `ETA ${etaLabel}` : 'ETA: Calculating…';

  return (
    <View style={styles.badge} testID={testID} accessibilityRole="text" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default EtaBadge;

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D8DBE0',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1D21',
  },
});
