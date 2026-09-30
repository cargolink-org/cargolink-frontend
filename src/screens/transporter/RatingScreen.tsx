import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { TransporterStackParamList } from '../../navigation/types';
import { submitRating } from '../../api/ratings';
import { getErrorMessage } from '../../utils/errorMessages';
import { useLoadStore, useRatingSubmitted } from '../../state/loadStore';
import { RatingForm, type SubmittedRating } from '../../components/RatingForm';

type Props = NativeStackScreenProps<TransporterStackParamList, 'Rating'>;

/**
 * RatingScreen (transporter variant) — Task G.1. The transporter rates
 * the shipper for a delivered load.
 *
 * ASSUMPTION (larger gap than the shipper side's — flag for review at
 * contract freeze): unlike the shipper side, where `vehicle_id` is at
 * least an imperfect-but-real counterparty-scoped identifier, there is
 * NO shipper-identifying value anywhere in the transporter's frontend
 * state. `loadStore`, as Task E.1's own top-of-file comment already
 * documents, is shipper-only state on the shipper's device — the
 * transporter side never receives an accepted load's shipper_id, only
 * `loadId`/`vehicleId` (see TransporterStack's `Tracking` route params).
 * This is the same pre-existing gap E.1 flagged for route-line/pickup-
 * destination data ("no data source yet exists on the transporter's
 * session ... flagged as a forward-looking integration gap"), now
 * surfacing here too. `loadId` is used as a placeholder value for
 * `rateeId` (wired from TrackingScreen's "Rate" quick-access button) —
 * this screen itself treats `rateeId` as an opaque string forwarded
 * as-is to `POST /ratings`, so it is NOT broken by the placeholder, but
 * the value will not be a real `users.id` until the backend/contract
 * supplies an actual shipper identifier to the transporter's accepted-load
 * state. Flag with Dinesh alongside the shipper-side ASSUMPTION in
 * `screens/shipper/RatingScreen.tsx`.
 */
export default function RatingScreen({ route, navigation }: Props) {
  const { loadId, rateeId } = route.params;

  const existingRating = useRatingSubmitted(loadId);
  const setRatingSubmitted = useLoadStore((s) => s.setRatingSubmitted);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleSubmit = async (values: SubmittedRating) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitRating({
        load_id: loadId,
        ratee_id: rateeId,
        score: values.score,
        comment: values.comment,
      });
      // No optimistic update — same convention as the shipper variant;
      // only reflects the server-confirmed submission.
      setRatingSubmitted(loadId, values);
      // No artificial delay/timer — same reasoning as the shipper
      // variant (see its top-of-file comment on this).
      navigation.goBack();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} testID="transporter-rating-screen">
      <RatingForm
        counterpartyLabel="shipper"
        existingRating={existingRating}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={(values) => void handleSubmit(values)}
        onSkip={() => navigation.goBack()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
});
