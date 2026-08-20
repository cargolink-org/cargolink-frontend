import React from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ShipperStackParamList } from '../../navigation/types';
import { getMatches, isGetMatchesError } from '../../api/loads';
import { useLoadStore } from '../../state/loadStore';
import { MatchCard } from '../../components/MatchCard';
import type { MatchResult } from '../../state/types';

type Props = NativeStackScreenProps<ShipperStackParamList, 'MatchResults'>;

/**
 * MatchResultsScreen — Task D.2.
 *
 * Lists transporters matched to the shipper's posted load, sorted by
 * `score` as returned by the API/mock (no client-side re-sort). Selecting
 * a card navigates to FareQuoteScreen. Built entirely against
 * `api/loads.ts`'s mock implementation per Sprint 3's scope — no live
 * OSRM/matching-engine dependency here.
 */
export default function MatchResultsScreen({ route, navigation }: Props) {
  const { loadId } = route.params;

  const matches = useLoadStore((s) => s.matches);
  const matchesLoadId = useLoadStore((s) => s.matchesLoadId);
  const isLoadingMatches = useLoadStore((s) => s.isLoadingMatches);
  const matchesError = useLoadStore((s) => s.matchesError);
  const setMatches = useLoadStore((s) => s.setMatches);
  const setMatchesError = useLoadStore((s) => s.setMatchesError);
  const setIsLoadingMatches = useLoadStore((s) => s.setIsLoadingMatches);
  const selectVehicle = useLoadStore((s) => s.selectVehicle);

  // Pull-to-refresh gets its own local flag, separate from the store's
  // isLoadingMatches (which drives the initial-fetch skeleton) — so a
  // refresh shows the pull-to-refresh spinner instead of re-triggering the
  // full-screen skeleton.
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchMatches = React.useCallback(
    async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoadingMatches(true);
      }
      setMatchesError(null);
      try {
        const results = await getMatches(loadId);
        setMatches(loadId, results);
      } catch (err) {
        setMatchesError(
          isGetMatchesError(err) ? err.message : 'Could not load matches. Please try again.'
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [loadId, setIsLoadingMatches, setMatches, setMatchesError]
  );

  // Brief-cache requirement (task D.2): skip the fetch if matches are
  // already cached for this exact loadId — e.g. navigating back from
  // FareQuoteScreen. A fresh loadId, or an explicit invalidateMatches()
  // call (accept-conflict recovery path), forces a re-fetch.
  React.useEffect(() => {
    if (matchesLoadId !== loadId) {
      void fetchMatches();
    }
    // Intentionally only re-runs when the loadId or cache-pointer changes,
    // not on every fetchMatches identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, matchesLoadId]);

  const handleRefresh = () => {
    void fetchMatches({ isRefresh: true });
  };

  const handleSelect = (vehicleId: string) => {
    selectVehicle(vehicleId);
    navigation.navigate('FareQuoteScreen', { loadId, vehicleId });
  };

  const renderItem = ({ item }: { item: MatchResult }) => (
    <MatchCard match={item} onPress={handleSelect} />
  );

  if (isLoadingMatches) {
    return (
      <View style={styles.centered} testID="match-results-loading">
        {/* Simple skeleton rows rather than a bare spinner, per the
            project's loading-state standard. */}
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard} />
        ))}
      </View>
    );
  }

  if (matchesError) {
    return (
      <View style={styles.centered} testID="match-results-error">
        <Text style={styles.errorTitle}>Couldn&apos;t load matches</Text>
        <Text style={styles.errorMessage}>{matchesError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void fetchMatches()}
          accessibilityRole="button"
          testID="match-results-retry-button"
        >
          <Text style={styles.retryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centered} testID="match-results-empty">
        <Text style={styles.emptyTitle}>No transporters available yet</Text>
        <Text style={styles.emptyMessage}>
          No transporters are available for this route yet — try adjusting your pickup deadline or
          check back soon.
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={handleRefresh}
          accessibilityRole="button"
          testID="match-results-empty-refresh-button"
        >
          {isRefreshing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.retryButtonLabel}>Refresh matches</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      testID="match-results-list"
      data={matches}
      keyExtractor={(item) => item.vehicle_id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      initialNumToRender={8}
      windowSize={7}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listContent: { padding: 16, paddingBottom: 32 },
  skeletonCard: {
    width: '100%',
    height: 88,
    borderRadius: 10,
    backgroundColor: '#EDEFF2',
    marginBottom: 12,
  },
  errorTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#1A1D21' },
  errorMessage: { fontSize: 14, color: '#5B6270', textAlign: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#1A1D21' },
  emptyMessage: { fontSize: 14, color: '#5B6270', textAlign: 'center', marginBottom: 20 },
  retryButton: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 160,
  },
  retryButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
