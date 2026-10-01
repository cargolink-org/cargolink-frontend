import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getAdminOverview, getAdminRoutes } from '../../api/admin';
import { AdminWidget } from '../../components/AdminWidget';
import { IntensityBarList } from '../../components/IntensityBarList';
import type { AdminStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { formatCompactCurrencyINR, formatCompactNumber } from '../../utils/numberFormatting';
import { AdminScreenShell } from './AdminScreenShell';
import { useAdminQuery } from './useAdminQuery';

type Props = NativeStackScreenProps<AdminStackParamList, 'DashboardOverview'>;

const PREVIEW_ROUTE_COUNT = 3;

/**
 * Task G.2 — operator landing view. Three widgets, each with its own
 * loading/error/empty lifecycle: shipments-by-status and gross revenue
 * (both read from `GET /admin/stats/overview`), and a top-routes preview
 * (reads `GET /admin/stats/routes`, sharing RoutesHeatmap's cache entry).
 * The preview deliberately does NOT use `overview.top_routes`, so a
 * failure of the overview call cannot also take down the routes preview —
 * the task's independent-widget-failure requirement.
 *
 * Delayed shipments: the count is shown exactly as returned; delay
 * flagging is backend-computed and never derived here.
 */
export default function DashboardOverview({ navigation }: Props): React.JSX.Element {
  const overview = useAdminQuery('admin:overview', getAdminOverview);
  const routes = useAdminQuery('admin:routes', getAdminRoutes);

  const o = overview.data;
  const counts = o ? [o.active, o.completed, o.delayed, o.cancelled ?? 0] : [];
  const overviewEmpty = !!o && counts.every((c) => c === 0) && o.revenue === 0;

  const statusSummary = o
    ? `${o.active} active, ${o.completed} completed, ${o.delayed} delayed${
        o.cancelled !== undefined ? `, ${o.cancelled} cancelled` : ''
      } shipments.`
    : undefined;

  const previewRows = (routes.data ?? []).slice(0, PREVIEW_ROUTE_COUNT);

  return (
    <AdminScreenShell
      title="Dashboard"
      active="DashboardOverview"
      navigation={navigation}
      onRefresh={() => {
        overview.reload();
        routes.reload();
      }}
    >
      <AdminWidget
        testID="widget-status"
        title="Shipments by status"
        status={overview.status}
        error={overview.error}
        onRetry={overview.reload}
        isEmpty={overviewEmpty}
        emptyMessage="No shipments yet."
        summary={statusSummary}
      >
        {o ? (
          <View style={styles.tiles}>
            <Tile testID="tile-active" label="Active" value={o.active} />
            <Tile testID="tile-completed" label="Completed" value={o.completed} />
            <Tile testID="tile-delayed" label="Delayed" value={o.delayed} tone="warning" />
            {o.cancelled !== undefined ? (
              <Tile testID="tile-cancelled" label="Cancelled" value={o.cancelled} />
            ) : null}
          </View>
        ) : null}
      </AdminWidget>

      <AdminWidget
        testID="widget-revenue"
        title="Gross revenue"
        status={overview.status}
        error={overview.error}
        onRetry={overview.reload}
        isEmpty={overviewEmpty}
        emptyMessage="No revenue yet."
        summary={o ? `Gross revenue ${formatCompactCurrencyINR(o.revenue)}.` : undefined}
      >
        {o ? (
          <Text style={styles.headline} testID="revenue-headline">
            {formatCompactCurrencyINR(o.revenue)}
          </Text>
        ) : null}
      </AdminWidget>

      <AdminWidget
        testID="widget-top-routes"
        title="Top routes"
        status={routes.status}
        error={routes.error}
        onRetry={routes.reload}
        isEmpty={routes.data !== null && routes.data.length === 0}
        emptyMessage="No route activity yet."
        summary={
          previewRows.length > 0
            ? `Busiest route: ${previewRows[0].route}, ${previewRows[0].shipment_count} shipments.`
            : undefined
        }
      >
        <IntensityBarList
          testID="top-routes-preview"
          rows={previewRows.map((r) => ({
            key: r.route,
            label: r.route,
            value: r.shipment_count,
            valueLabel: formatCompactNumber(r.shipment_count),
          }))}
        />
        <Pressable
          onPress={() => navigation.navigate('RoutesHeatmap')}
          accessibilityRole="link"
          testID="view-all-routes"
        >
          <Text style={styles.link}>View all routes</Text>
        </Pressable>
      </AdminWidget>
    </AdminScreenShell>
  );
}

function Tile({
  testID,
  label,
  value,
  tone,
}: {
  testID: string;
  label: string;
  value: number;
  tone?: 'warning';
}): React.JSX.Element {
  return (
    <View style={styles.tile} testID={testID} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.tileValue, tone === 'warning' && styles.tileWarning]}>
        {formatCompactNumber(value)}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { color: colors.textPrimary, fontSize: 32, fontWeight: '700' },
  link: { color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 4 },
  tile: {
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
    marginRight: 8,
    minWidth: 120,
    padding: 12,
  },
  tileLabel: { color: colors.textSecondary, fontSize: 13 },
  tileValue: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  tileWarning: { color: colors.warning },
  tiles: { flexDirection: 'row', flexWrap: 'wrap' },
});
