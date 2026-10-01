import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

/**
 * Task G.2 — ranked list with a proportional intensity bar per row. This is
 * the deliberate, documented interpretation of "heatmap" (see
 * frontend/README.md): built from plain RN Views so it renders identically
 * on native and RN Web, and is testable under jest-expo without a
 * DOM-only charting library.
 *
 * Bar width is `value / max` of the rows it was GIVEN — a presentational
 * ratio, not a re-aggregation of any backend-owned metric. Row order is
 * exactly the order supplied (the backend ranks; the client never re-sorts).
 */
export interface IntensityRow {
  key: string;
  label: string;
  value: number;
  /** Already-formatted display value (e.g. via numberFormatting.ts). */
  valueLabel: string;
}

interface IntensityBarListProps {
  testID: string;
  rows: IntensityRow[];
}

export function IntensityBarList({ testID, rows }: IntensityBarListProps): React.JSX.Element {
  const max = rows.reduce((m, r) => (r.value > m ? r.value : m), 0);

  return (
    <View testID={testID}>
      {rows.map((row, index) => {
        const pct = max > 0 ? Math.max(2, Math.round((row.value / max) * 100)) : 0;
        return (
          <View
            key={row.key}
            style={styles.row}
            testID={`${testID}-row-${row.key}`}
            accessible
            accessibilityLabel={`${index + 1}. ${row.label}, ${row.valueLabel}`}
          >
            <View style={styles.labels}>
              <Text style={styles.label}>{`${index + 1}. ${row.label}`}</Text>
              <Text style={styles.value}>{row.valueLabel}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} testID={`${testID}-bar-${row.key}`} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: colors.accent, borderRadius: 4, height: 8 },
  label: { color: colors.textPrimary, flexShrink: 1, fontSize: 14 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  row: { marginBottom: 12 },
  track: { backgroundColor: colors.accentSoft, borderRadius: 4, height: 8, overflow: 'hidden' },
  value: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginLeft: 12 },
});

export default IntensityBarList;
