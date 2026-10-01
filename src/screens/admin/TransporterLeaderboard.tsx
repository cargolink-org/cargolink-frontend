import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getTransporterLeaderboard } from '../../api/admin';
import { AdminWidget } from '../../components/AdminWidget';
import type { AdminStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { formatCompactNumber } from '../../utils/numberFormatting';
import { AdminScreenShell } from './AdminScreenShell';
import { useAdminQuery } from './useAdminQuery';

type Props = NativeStackScreenProps<AdminStackParamList, 'TransporterLeaderboard'>;

/**
 * Task G.2 — transporters ranked by rating/performance. Rank is the
 * position in the backend-supplied order; the client never re-sorts or
 * recomputes `rating_avg` / `completed_trips`.
 */
export default function TransporterLeaderboard({ navigation }: Props): React.JSX.Element {
  const board = useAdminQuery('admin:leaderboard', getTransporterLeaderboard);
  const data = board.data ?? [];

  return (
    <AdminScreenShell
      title="Transporter leaderboard"
      active="TransporterLeaderboard"
      navigation={navigation}
      onRefresh={board.reload}
    >
      <AdminWidget
        testID="widget-leaderboard"
        title="Top transporters"
        status={board.status}
        error={board.error}
        onRetry={board.reload}
        isEmpty={board.data !== null && data.length === 0}
        emptyMessage="No rated transporters yet."
        summary={
          data.length > 0
            ? `Top transporter: ${data[0].name}, rated ${data[0].rating_avg.toFixed(1)} out of 5.`
            : undefined
        }
      >
        {data.map((t, index) => (
          <View
            key={t.transporter_id}
            style={styles.row}
            testID={`leaderboard-row-${t.transporter_id}`}
            accessible
            accessibilityLabel={`Rank ${index + 1}, ${t.name}, rating ${t.rating_avg.toFixed(1)} out of 5, ${t.completed_trips} completed trips`}
          >
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.name}>{t.name}</Text>
            <Text style={styles.rating}>{`★ ${t.rating_avg.toFixed(1)}`}</Text>
            <Text style={styles.trips}>{`${formatCompactNumber(t.completed_trips)} trips`}</Text>
          </View>
        ))}
      </AdminWidget>
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.textPrimary, flex: 1, fontSize: 14 },
  rank: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', width: 28 },
  rating: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginHorizontal: 12 },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  trips: { color: colors.textSecondary, fontSize: 13, minWidth: 72, textAlign: 'right' },
});
