// src/components/RatingForm.tsx
//
// Task G.1 — not in the task spec's own "Files to Create" list, added
// here for the same reason `ProfileForm.tsx` (Task C.1) exists: the
// spec's two screen files (`screens/shipper/RatingScreen.tsx`,
// `screens/transporter/RatingScreen.tsx`) need materially the same
// star-input/comment/submit/read-only logic, differing only in the
// counterparty being rated and each stack's own route typing. Per the
// project's "shared logic is always reused over duplicated" principle
// (ways-of-working), that shared logic lives here once; each screen is a
// thin wrapper owning route params, `loadStore`, and the actual
// `POST /ratings` call — this component only renders and validates.

import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';

import { StarInput } from './StarInput';
import { ratingSchema } from '../validation/ratingSchema';

export interface SubmittedRating {
  score: number;
  comment?: string;
}

export interface RatingFormProps {
  /** Who the signed-in user is rating — drives the header copy only
   * ("Rate the transporter" / "Rate the shipper"). Has no bearing on
   * which id is actually submitted — that's `rateeId`, owned entirely by
   * the calling screen (see the security note in each RatingScreen.tsx),
   * never this component. */
  counterpartyLabel: string;
  /** Present → read-only mode (a rating already exists for this load in
   * this session). Undefined → submittable mode. */
  existingRating?: SubmittedRating;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: SubmittedRating) => void;
  onSkip: () => void;
}

const MAX_COMMENT_LENGTH = 500;

export function RatingForm({
  counterpartyLabel,
  existingRating,
  isSubmitting,
  submitError,
  onSubmit,
  onSkip,
}: RatingFormProps) {
  const [score, setScore] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Read-only mode — a submitted rating already exists for this load.
  // Checked first and unconditionally: the submittable form below is
  // structurally unreachable once this is true, which is this task's
  // "blocked client-side" duplicate-submission guard (see api/ratings.ts's
  // RATING_DUPLICATE path for the defensive server-rejection handling on
  // top of this).
  if (existingRating) {
    return (
      <View style={styles.container} testID="rating-form-readonly">
        <Text style={styles.title}>You rated this trip</Text>
        <StarInput value={existingRating.score} readOnly testID="rating-form-star-display" />
        {existingRating.comment ? (
          <Text style={styles.readOnlyComment} testID="rating-form-readonly-comment">
            {existingRating.comment}
          </Text>
        ) : null}
      </View>
    );
  }

  const handleSubmitPress = () => {
    // Defense-in-depth validation — the Submit button is already disabled
    // until a star is selected and the comment input already caps at
    // MAX_COMMENT_LENGTH, so this mirrors the project-wide pattern (see
    // checkpointUpdateSchema.ts) rather than catching a value the UI
    // could actually produce.
    const parsed = ratingSchema.safeParse({
      score,
      comment: comment.trim() === '' ? undefined : comment.trim(),
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Select a star rating.');
      return;
    }
    setValidationError(null);
    onSubmit(parsed.data);
  };

  return (
    <View style={styles.container} testID="rating-form">
      <Text style={styles.title}>Rate the {counterpartyLabel}</Text>
      <Text style={styles.subtitle}>How was your experience on this trip?</Text>

      <StarInput value={score} onChange={setScore} testID="rating-form-star-input" />

      <Text style={styles.commentLabel}>Comment (optional)</Text>
      <TextInput
        style={styles.commentInput}
        value={comment}
        onChangeText={(text) => setComment(text.slice(0, MAX_COMMENT_LENGTH))}
        placeholder="Share more about your experience…"
        multiline
        maxLength={MAX_COMMENT_LENGTH}
        testID="rating-form-comment-input"
        accessibilityLabel="Comment"
      />
      <Text style={styles.charCount} testID="rating-form-char-count">
        {comment.length}/{MAX_COMMENT_LENGTH}
      </Text>

      {(validationError || submitError) && (
        <Text style={styles.error} accessibilityRole="alert" testID="rating-form-error">
          {validationError ?? submitError}
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.skipButton}
          onPress={onSkip}
          disabled={isSubmitting}
          accessibilityRole="button"
          testID="rating-form-skip-button"
        >
          <Text style={styles.skipButtonLabel}>Skip for now</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, (isSubmitting || score < 1) && styles.submitButtonDisabled]}
          onPress={handleSubmitPress}
          disabled={isSubmitting || score < 1}
          accessibilityRole="button"
          testID="rating-form-submit-button"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonLabel}>Submit rating</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default RatingForm;

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  charCount: { color: '#9AA1AC', fontSize: 11, marginTop: 4, textAlign: 'right' },
  commentInput: {
    borderColor: '#D8DBE0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1A1D21',
    fontSize: 14,
    minHeight: 90,
    padding: 12,
    textAlignVertical: 'top',
  },
  commentLabel: { color: '#1A1D21', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 20 },
  container: { padding: 20 },
  error: { color: '#B3261E', fontSize: 13, marginTop: 14 },
  readOnlyComment: { color: '#3A4048', fontSize: 14, lineHeight: 20, marginTop: 14 },
  skipButton: {
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
  skipButtonLabel: { color: '#3A4048', fontSize: 14, fontWeight: '600' },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  subtitle: { color: '#5B6270', fontSize: 14, marginBottom: 16 },
  title: { color: '#1A1D21', fontSize: 20, fontWeight: '700', marginBottom: 4 },
});
