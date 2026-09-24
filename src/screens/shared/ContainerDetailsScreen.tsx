// src/screens/shared/ContainerDetailsScreen.tsx
//
// Task F.1 — sea/air container detail view (source doc Module 4.5c).
// Explicitly distinguished from the road-vehicle live-GPS tracking screen
// (Cluster E) via the header note below, so users don't confuse the two
// data sources — this screen shows multi-leg/container-level shipping
// metadata, not a live position.

import React from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';

import { getContainerDetails } from '../../api/documents';
import {
  useLoadStore,
  useContainer,
  useContainerLoading,
  useContainerError,
} from '../../state/loadStore';
import { getErrorMessage } from '../../utils/errorMessages';

// See DocumentChecklistScreen.tsx's Props comment for why a local, minimal
// param list is used instead of a union of both stacks' full param lists.
type ContainerDetailsParamList = { ContainerDetails: { loadId: string } };
interface Props {
  route: RouteProp<ContainerDetailsParamList, 'ContainerDetails'>;
}

const FIELD_ROWS: { key: keyof NonNullable<ReturnType<typeof useContainer>>; label: string }[] = [
  { key: 'containerNumber', label: 'Container number' },
  { key: 'vesselOrFlight', label: 'Vessel / flight reference' },
  { key: 'portOfLoading', label: 'Port of loading' },
  { key: 'portOfDischarge', label: 'Port of discharge' },
];

export default function ContainerDetailsScreen({ route }: Props) {
  const { loadId } = route.params;

  // `container[loadId]` is `undefined` until the first fetch resolves,
  // then either a `ContainerDetails` object or `null` ("fetched, not
  // applicable") — see loadStore.ts's doc comment on the `container` map.
  const container = useContainer(loadId);
  const isLoading = useContainerLoading(loadId);
  const fetchError = useContainerError(loadId);
  const setContainer = useLoadStore((s) => s.setContainer);
  const setContainerLoading = useLoadStore((s) => s.setContainerLoading);
  const setContainerError = useLoadStore((s) => s.setContainerError);

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchContainer = React.useCallback(
    async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setContainerLoading(loadId, true);
      }
      try {
        const result = await getContainerDetails(loadId);
        setContainer(loadId, result);
      } catch (err) {
        setContainerError(loadId, getErrorMessage(err));
      } finally {
        setIsRefreshing(false);
      }
    },
    [loadId, setContainer, setContainerError, setContainerLoading]
  );

  React.useEffect(() => {
    if (container === undefined) {
      void fetchContainer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, container === undefined]);

  const handleRefresh = () => {
    void fetchContainer({ isRefresh: true });
  };

  if (isLoading) {
    return (
      <View style={styles.centered} testID="container-details-loading">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonRow} />
        ))}
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered} testID="container-details-error">
        <Text style={styles.errorTitle}>Couldn&apos;t load container details</Text>
        <Text style={styles.errorMessage}>{fetchError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void fetchContainer()}
          accessibilityRole="button"
          testID="container-details-retry-button"
        >
          <Text style={styles.retryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID="container-details-screen"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.title}>Container details</Text>
      <Text style={styles.headerNote}>
        Sea/air container tracking — separate from this shipment&apos;s live road-vehicle location.
      </Text>

      {container === null || container === undefined ? (
        <View style={styles.emptyState} testID="container-details-not-applicable">
          <Text style={styles.emptyTitle}>Not applicable for this shipment</Text>
          <Text style={styles.emptyText}>
            This is a domestic road shipment with no container record — container tracking only
            applies to sea/air cargo.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {FIELD_ROWS.map(({ key, label }) => (
            <View key={key} style={styles.row} testID={`container-field-${key}`}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <Text style={styles.fieldValue}>{container[key]}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  skeletonRow: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EDEFF2',
    marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, color: '#1A1D21' },
  headerNote: { fontSize: 13, color: '#5B6270', marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: '#EDEFF2',
    borderRadius: 10,
    padding: 4,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEFF2',
  },
  fieldLabel: { fontSize: 12, color: '#5B6270', marginBottom: 3 },
  fieldValue: { fontSize: 15, fontWeight: '600', color: '#1A1D21' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#1A1D21' },
  emptyText: { fontSize: 14, color: '#5B6270', textAlign: 'center' },
  errorTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#1A1D21' },
  errorMessage: { fontSize: 14, color: '#5B6270', textAlign: 'center', marginBottom: 16 },
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
