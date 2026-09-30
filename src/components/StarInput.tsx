import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export interface StarInputProps {
  /** Currently selected value, 1–5. 0 means no rating selected yet
   * (submittable mode's initial state). */
  value: number;
  /** Omitted in read-only mode — nothing calls it there since `readOnly`
   * disables the underlying `Pressable`s. */
  onChange?: (value: number) => void;
  readOnly?: boolean;
  maxStars?: number;
  testID?: string;
}

const FILLED = '★';
const EMPTY = '☆';

/**
 * Reusable, prop-driven 1–5 star input (Task G.1). One component, two
 * modes — the interactive control on `RatingForm`'s submittable form, and,
 * with `readOnly`, the non-interactive display of an already-submitted
 * rating — per the task's explicit architecture requirement. Mirrors
 * `DocumentStatusBadge`'s single-component/many-states precedent rather
 * than forking a second read-only star component.
 */
export function StarInput({
  value,
  onChange,
  readOnly = false,
  maxStars = 5,
  testID = 'star-input',
}: StarInputProps) {
  // Announced to screen readers as one value rather than five unlabeled
  // icons, per the task's explicit accessibility requirement (e.g. "3 out
  // of 5 stars, selected").
  const announcedLabel =
    value > 0
      ? `${value} out of ${maxStars} stars, selected`
      : `No rating selected, ${maxStars} stars available`;

  return (
    <View
      style={styles.row}
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityLabel={announcedLabel}
      accessibilityValue={
        value > 0 ? { min: 1, max: maxStars, now: value } : { min: 1, max: maxStars }
      }
    >
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((starNumber) => {
        const filled = starNumber <= value;
        return (
          <Pressable
            key={starNumber}
            onPress={() => onChange?.(starNumber)}
            disabled={readOnly}
            style={styles.starTouchTarget}
            accessibilityRole="button"
            accessibilityLabel={`${starNumber} star${starNumber > 1 ? 's' : ''}`}
            accessibilityState={{ selected: filled, disabled: readOnly }}
            testID={`${testID}-star-${starNumber}`}
          >
            <Text style={[styles.star, filled ? styles.starFilled : styles.starEmpty]}>
              {filled ? FILLED : EMPTY}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default StarInput;

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  star: { fontSize: 32 },
  starEmpty: { color: '#D8DBE0' },
  starFilled: { color: '#F5A623' },
  starTouchTarget: { padding: 4 },
});
