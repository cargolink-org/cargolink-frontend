import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type { FareQuote } from '../state/types';
import { formatCurrencyINR } from '../utils/formatters';

export interface FareBreakdownProps {
  quote: FareQuote;
}

interface LineItem {
  label: string;
  amount: number;
  testID: string;
}

/**
 * Renders a fare quote's line-item breakdown (base fare, distance cost,
 * surcharge, total). Standalone and prop-driven — no data fetching or
 * store access — so it's reusable anywhere a fare summary needs to be
 * shown again later, per the guide's explicit note.
 */
export function FareBreakdown({ quote }: FareBreakdownProps) {
  const lineItems: LineItem[] = [
    { label: 'Base fare', amount: quote.base_fare, testID: 'fare-breakdown-base-fare' },
    { label: 'Distance cost', amount: quote.distance_cost, testID: 'fare-breakdown-distance-cost' },
    { label: 'Surcharge', amount: quote.surcharge, testID: 'fare-breakdown-surcharge' },
  ];

  return (
    <View style={styles.container} testID="fare-breakdown">
      {lineItems.map((item) => (
        <View key={item.testID} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text
            style={styles.amount}
            testID={item.testID}
            accessibilityLabel={`${item.label}: ${formatCurrencyINR(item.amount)}`}
          >
            {formatCurrencyINR(item.amount)}
          </Text>
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text
          style={styles.totalAmount}
          testID="fare-breakdown-total"
          accessibilityLabel={`Total fare: ${formatCurrencyINR(quote.total)}`}
        >
          {formatCurrencyINR(quote.total)}
        </Text>
      </View>
    </View>
  );
}

export default FareBreakdown;

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#D8DBE0',
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: { fontSize: 14, color: '#5B6270' },
  amount: { fontSize: 14, color: '#1A1D21', fontWeight: '500' },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEEF1',
    marginVertical: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1D21' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: '#0B5FCC' },
});
