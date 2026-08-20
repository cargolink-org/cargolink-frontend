import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import type { MatchResult } from '../state/types';
import { formatDistanceKm } from '../utils/formatters';

export interface MatchCardProps {
  match: MatchResult;
  onPress: (vehicleId: string) => void;
}

/**
 * Renders a single matched transporter's summary (distance, capacity fit,
 * ETA, score) as a tappable card. Standalone and prop-driven — no data
 * fetching or store access — so it stays reusable and easy to unit test in
 * isolation, per the guide's component-architecture requirement.
 */
export function MatchCard({ match, onPress }: MatchCardProps) {
  const scorePercent = Math.round(match.score * 100);

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(match.vehicle_id)}
      accessibilityRole="button"
      accessibilityLabel={`Transporter match, score ${scorePercent} percent, ${formatDistanceKm(
        match.distance_km
      )} away, ETA ${match.eta}`}
      testID={`match-card-${match.vehicle_id}`}
    >
      <View style={styles.row}>
        <Text style={styles.scoreText} accessibilityLabel={`Match score: ${scorePercent} percent`}>
          {scorePercent}% match
        </Text>
        <View
          style={[styles.fitBadge, match.capacity_fit ? styles.fitBadgeYes : styles.fitBadgeNo]}
          accessibilityLabel={`Capacity fit: ${match.capacity_fit ? 'yes' : 'no'}`}
        >
          <Text style={styles.fitBadgeText}>
            {match.capacity_fit ? 'Capacity fits' : "Doesn't fit"}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text
          style={styles.detailText}
          accessibilityLabel={`Distance: ${formatDistanceKm(match.distance_km).replace('km', 'kilometers')}`}
          testID={`match-card-${match.vehicle_id}-distance`}
        >
          {formatDistanceKm(match.distance_km)} away
        </Text>
        <Text
          style={styles.detailText}
          accessibilityLabel={`Estimated time of arrival: ${match.eta}`}
          testID={`match-card-${match.vehicle_id}-eta`}
        >
          ETA {match.eta}
        </Text>
      </View>
    </Pressable>
  );
}

export default MatchCard;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#D8DBE0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D21',
  },
  fitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fitBadgeYes: { backgroundColor: '#DFF6E4' },
  fitBadgeNo: { backgroundColor: '#FBE0E0' },
  fitBadgeText: { fontSize: 12, fontWeight: '600', color: '#1A1D21' },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailText: {
    fontSize: 13,
    color: '#5B6270',
  },
});
