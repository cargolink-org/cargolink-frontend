import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ShipperStackParamList } from '../../navigation/types';
import { submitRating } from '../../api/ratings';
import { getErrorMessage } from '../../utils/errorMessages';
import { useLoadStore, useRatingSubmitted } from '../../state/loadStore';
import { RatingForm, type SubmittedRating } from '../../components/RatingForm';

type Props = NativeStackScreenProps<ShipperStackParamList, 'Rating'>;

/**
 * RatingScreen (shipper variant) — Task G.1. The shipper rates the
 * transporter for a delivered load.
 *
 * ASSUMPTION (flag for review at contract freeze, same category as this
 * codebase's other flagged items): the `ratings` table's `ratee_id`
 * (technical spec §4) is a `users.id` FK, but neither `MatchResult` nor
 * `AcceptedMatch` (state/types.ts) — the only shipper-side data this app
 * has about the matched transporter — carries an actual transporter user
 * id anywhere. Per this task's own Dependencies section framing
 * ("vehicle_id/transporter identity for the shipper's rating flow"),
 * `vehicle_id` is used here as the value passed as `rateeId` (wired from
 * TrackingScreen's "Rate" quick-access button, which is the only place
 * with a `vehicleId` in scope). This is structurally correct as "the
 * counterparty identifier this screen forwards to the server," but is
 * very possibly NOT the real `users.id` the backend's `ratings.ratee_id`
 * column expects — flag with Dinesh whether `GET /loads/{id}/matches` or
 * `POST /loads/{id}/accept` needs an explicit `transporter_id` field
 * added for this to be strictly correct, the same way F.1/F.2 flagged
 * their own contract gaps.
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
      // No optimistic update — only reflect the server-confirmed
      // submission, matching CheckpointTimelineScreen's (Task F.1)
      // established "no optimistic updates" convention: this only runs
      // once `submitRating` has actually resolved.
      setRatingSubmitted(loadId, values);
      // No artificial delay/timer — matches FareQuoteScreen's (Task D.2)
      // immediate-navigate-on-success precedent. RatingForm would already
      // render the read-only confirmation on this same update (since
      // `existingRating` now resolves truthy) if this screen weren't
      // navigating away; the read-only view is also what greets the user
      // if they revisit this screen for an already-rated load later.
      navigation.goBack();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} testID="shipper-rating-screen">
      <RatingForm
        counterpartyLabel="transporter"
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
