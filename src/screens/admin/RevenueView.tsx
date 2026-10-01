import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getAdminRevenue } from '../../api/admin';
import { AdminWidget } from '../../components/AdminWidget';
import { IntensityBarList } from '../../components/IntensityBarList';
import type { AdminStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { formatCompactCurrencyINR } from '../../utils/numberFormatting';
import { defaultDateRange, validateDateRange } from '../../validation/dateRange';
import { AdminScreenShell } from './AdminScreenShell';
import { useAdminQuery } from './useAdminQuery';

type Props = NativeStackScreenProps<AdminStackParamList, 'RevenueView'>;

/**
 * Task G.2 — revenue by route and by period, with a date-range filter.
 * Draft inputs and the APPLIED range are separate state: a fetch fires only
 * when Apply is pressed AND `validateDateRange` passes (start <= end), so an
 * invalid range never reaches the API. Revenue figures are displayed as
 * returned — never summed client-side.
 */
export default function RevenueView({ navigation }: Props): React.JSX.Element {
  const initial = defaultDateRange();
  const [draftFrom, setDraftFrom] = useState(initial.from);
  const [draftTo, setDraftTo] = useState(initial.to);
  const [applied, setApplied] = useState(initial);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const revenue = useAdminQuery(`admin:revenue:${applied.from}:${applied.to}`, () =>
    getAdminRevenue(applied.from, applied.to)
  );

  const apply = () => {
    const error = validateDateRange(draftFrom, draftTo);
    setRangeError(error);
    if (error === null) {
      setApplied({ from: draftFrom, to: draftTo });
    }
  };

  const data = revenue.data;
  const isEmpty = !!data && data.by_route.length === 0 && data.by_period.length === 0;

  return (
    <AdminScreenShell title="Revenue" active="RevenueView" navigation={navigation} onRefresh={revenue.reload}>
      <View style={styles.filter}>
        <View style={styles.field}>
          <Text style={styles.label}>From</Text>
          <TextInput
            style={styles.input}
            value={draftFrom}
            onChangeText={setDraftFrom}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            accessibilityLabel="Start date"
            testID="revenue-from"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>To</Text>
          <TextInput
            style={styles.input}
            value={draftTo}
            onChangeText={setDraftTo}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            accessibilityLabel="End date"
            testID="revenue-to"
          />
        </View>
        <Pressable style={styles.apply} onPress={apply} accessibilityRole="button" testID="revenue-apply">
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </View>
      {rangeError ? (
        <Text style={styles.error} accessibilityRole="alert" testID="revenue-range-error">
          {rangeError}
        </Text>
      ) : null}

      <AdminWidget
        testID="widget-revenue-by-route"
        title="Revenue by route"
        status={revenue.status}
        error={revenue.error}
        onRetry={revenue.reload}
        isEmpty={isEmpty || (!!data && data.by_route.length === 0)}
        summary={
          data && data.by_route.length > 0
            ? `Top route by revenue: ${data.by_route[0].route}, ${formatCompactCurrencyINR(
                data.by_route[0].revenue
              )}.`
            : undefined
        }
      >
        <IntensityBarList
          testID="revenue-by-route"
          rows={(data?.by_route ?? []).map((r) => ({
            key: r.route,
            label: r.route,
            value: r.revenue,
            valueLabel: formatCompactCurrencyINR(r.revenue),
          }))}
        />
      </AdminWidget>

      <AdminWidget
        testID="widget-revenue-by-period"
        title="Revenue by period"
        status={revenue.status}
        error={revenue.error}
        onRetry={revenue.reload}
        isEmpty={isEmpty || (!!data && data.by_period.length === 0)}
        summary={data && data.by_period.length > 0 ? `${data.by_period.length} periods shown.` : undefined}
      >
        <IntensityBarList
          testID="revenue-by-period"
          rows={(data?.by_period ?? []).map((p) => ({
            key: p.period,
            label: p.period,
            value: p.revenue,
            valueLabel: formatCompactCurrencyINR(p.revenue),
          }))}
        />
      </AdminWidget>
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  apply: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderRadius: 6,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  applyText: { color: colors.surface, fontSize: 14, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14, marginBottom: 12 },
  field: { marginBottom: 12, marginRight: 12 },
  filter: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap' },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 14,
    minWidth: 140,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 4 },
});
