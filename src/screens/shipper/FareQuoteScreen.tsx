import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ShipperStackParamList } from '../../navigation/types';
import { getQuote, isFareQuoteError } from '../../api/pricing';
import { acceptMatch, isAcceptMatchError } from '../../api/loads';
import { useLoadStore } from '../../state/loadStore';
import { FareBreakdown } from '../../components/FareBreakdown';

type Props = NativeStackScreenProps<ShipperStackParamList, 'FareQuoteScreen'>;

/** Local UI-only classification of the accept failure, used to decide
 * which recovery affordance to show. The store only tracks the display
 * message (`acceptError: string | null`, per the task's store-shape spec)
 * — the "which recovery path" decision is a screen-level concern. */
type AcceptFailureKind = 'conflict' | 'retryable' | null;

export default function FareQuoteScreen({ route, navigation }: Props) {
  const { loadId, vehicleId, eta } = route.params;

  const quote = useLoadStore((s) => s.quote);
  const isLoadingQuote = useLoadStore((s) => s.isLoadingQuote);
  const quoteError = useLoadStore((s) => s.quoteError);
  const setQuote = useLoadStore((s) => s.setQuote);
  const setQuoteError = useLoadStore((s) => s.setQuoteError);
  const setIsLoadingQuote = useLoadStore((s) => s.setIsLoadingQuote);
  const isAccepting = useLoadStore((s) => s.isAccepting);
  const acceptError = useLoadStore((s) => s.acceptError);
  const setAcceptError = useLoadStore((s) => s.setAcceptError);
  const setIsAccepting = useLoadStore((s) => s.setIsAccepting);
  const setAcceptedMatch = useLoadStore((s) => s.setAcceptedMatch);
  const invalidateMatches = useLoadStore((s) => s.invalidateMatches);

  const [acceptFailureKind, setAcceptFailureKind] = React.useState<AcceptFailureKind>(null);
  const [isStaleQuote, setIsStaleQuote] = React.useState(false);

  const fetchQuote = React.useCallback(async () => {
    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const result = await getQuote(loadId, vehicleId);
      setQuote(result);
    } catch (err) {
      setQuoteError(
        isFareQuoteError(err) ? err.message : 'Could not load the fare quote. Please try again.'
      );
    }
  }, [loadId, vehicleId, setIsLoadingQuote, setQuote, setQuoteError]);

  React.useEffect(() => {
    void fetchQuote();
    // Re-fetch only when the load/vehicle pairing actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, vehicleId]);

  const handleAccept = async () => {
    // Defensive guard (Validation section) — practically always true since
    // the route param is required and typed, but never assume.
    if (!vehicleId || !quote) {
      return;
    }

    setIsAccepting(true);
    setAcceptError(null);
    setAcceptFailureKind(null);

    // Silently re-check the quote right before committing — catches the
    // price having moved since the shipper first viewed it (stale-quote
    // edge case). Not surfaced as a loading state of its own; the Accept
    // button's spinner already covers this whole operation.
    let freshQuote;
    try {
      freshQuote = await getQuote(loadId, vehicleId);
    } catch (err) {
      setAcceptError(
        isFareQuoteError(err) ? err.message : 'Could not confirm the current price. Please try again.'
      );
      setAcceptFailureKind('retryable');
      setIsAccepting(false);
      return;
    }

    if (freshQuote.total !== quote.total) {
      // Distinct from a generic error: surface the updated price and stop
      // — never silently accept at a price the shipper hasn't seen.
      setQuote(freshQuote);
      setIsStaleQuote(true);
      setIsAccepting(false);
      return;
    }

    setIsStaleQuote(false);

    try {
      const response = await acceptMatch(loadId, vehicleId);
      setAcceptedMatch(response);
      // vehicleId/eta (task E.1) — Tracking needs vehicleId to call
      // GET /tracking/{vehicleId} and join the right room; eta is
      // forwarded so EtaBadge shows real matching-engine data instead of
      // a client-synthesized estimate.
      navigation.navigate('Tracking', { loadId, vehicleId, eta });
    } catch (err) {
      if (isAcceptMatchError(err)) {
        setAcceptError(err.message);
        setAcceptFailureKind(err.kind === 'conflict' ? 'conflict' : 'retryable');
      } else {
        setAcceptError('Something went wrong. Please try again.');
        setAcceptFailureKind('retryable');
      }
      setIsAccepting(false);
    }
  };

  const handleRefreshMatches = () => {
    invalidateMatches();
    navigation.navigate('MatchResults', { loadId });
  };

  if (isLoadingQuote) {
    return (
      <View style={styles.centered} testID="fare-quote-loading">
        <View style={styles.skeletonBlock} />
      </View>
    );
  }

  if (quoteError) {
    return (
      <View style={styles.centered} testID="fare-quote-error">
        <Text style={styles.errorTitle}>Couldn&apos;t load the fare quote</Text>
        <Text style={styles.errorMessage}>{quoteError}</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => void fetchQuote()}
          accessibilityRole="button"
          testID="fare-quote-retry-button"
        >
          <Text style={styles.primaryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!quote) {
    // Defensive fallback — shouldn't normally be reachable (loading/error
    // states above cover every other outcome of the fetch).
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Fare quote</Text>
      <Text style={styles.subtitle}>Review the price before accepting this transporter.</Text>

      <FareBreakdown quote={quote} />

      {isStaleQuote && (
        <View style={styles.staleBanner} testID="fare-quote-stale-banner">
          <Text style={styles.staleBannerText}>
            The price for this transporter has changed since you last viewed it. Review the updated
            total above, then tap Accept again to confirm.
          </Text>
        </View>
      )}

      {acceptError && acceptFailureKind === 'conflict' && (
        <View style={styles.conflictBanner} testID="fare-quote-conflict-banner">
          <Text style={styles.conflictBannerText}>{acceptError}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={handleRefreshMatches}
            accessibilityRole="button"
            testID="fare-quote-refresh-matches-button"
          >
            <Text style={styles.primaryButtonLabel}>Refresh matches</Text>
          </Pressable>
        </View>
      )}

      {acceptError && acceptFailureKind === 'retryable' && (
        <Text style={styles.submitError} accessibilityRole="alert" testID="fare-quote-error-banner">
          {acceptError}
        </Text>
      )}

      <Pressable
        style={[styles.acceptButton, (isAccepting || !vehicleId) && styles.acceptButtonDisabled]}
        onPress={() => void handleAccept()}
        disabled={isAccepting || !vehicleId}
        accessibilityRole="button"
        testID="fare-quote-accept-button"
      >
        {isAccepting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.acceptButtonLabel}>Accept</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  skeletonBlock: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#EDEFF2',
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5B6270', marginBottom: 20 },
  errorTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#1A1D21' },
  errorMessage: { fontSize: 14, color: '#5B6270', textAlign: 'center', marginBottom: 16 },
  primaryButton: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  staleBanner: {
    backgroundColor: '#FFF6E5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0D28C',
    padding: 14,
    marginTop: 20,
  },
  staleBannerText: { fontSize: 13, color: '#5B4600', lineHeight: 18 },
  conflictBanner: {
    backgroundColor: '#FBE0E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0B8B8',
    padding: 14,
    marginTop: 20,
  },
  conflictBannerText: { fontSize: 13, color: '#8A1F1F', marginBottom: 10 },
  submitError: { color: '#B3261E', fontSize: 13, marginTop: 16, textAlign: 'center' },
  acceptButton: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  acceptButtonDisabled: { opacity: 0.6 },
  acceptButtonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
