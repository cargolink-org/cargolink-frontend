import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getAdminRoutes } from '../../api/admin';
import { AdminWidget } from '../../components/AdminWidget';
import { IntensityBarList } from '../../components/IntensityBarList';
import type { AdminStackParamList } from '../../navigation/types';
import { formatCompactNumber } from '../../utils/numberFormatting';
import { AdminScreenShell } from './AdminScreenShell';
import { useAdminQuery } from './useAdminQuery';

type Props = NativeStackScreenProps<AdminStackParamList, 'RoutesHeatmap'>;

/**
 * Task G.2 — popular corridors. SCOPING DECISION (also in README): a true
 * geographic heatmap needs a map/GIS layer that is out of scope here, so
 * "heatmap" is delivered as the task's explicitly-allowed alternative — a
 * ranked list with a proportional intensity bar. Ranking order is the
 * backend's; the client does not re-sort.
 */
export default function RoutesHeatmap({ navigation }: Props): React.JSX.Element {
  const routes = useAdminQuery('admin:routes', getAdminRoutes);
  const data = routes.data ?? [];

  return (
    <AdminScreenShell
      title="Popular routes"
      active="RoutesHeatmap"
      navigation={navigation}
      onRefresh={routes.reload}
    >
      <AdminWidget
        testID="widget-routes"
        title="Shipments by corridor"
        status={routes.status}
        error={routes.error}
        onRetry={routes.reload}
        isEmpty={routes.data !== null && data.length === 0}
        emptyMessage="No route activity yet."
        summary={
          data.length > 0
            ? `${data.length} routes. Busiest: ${data[0].route} with ${data[0].shipment_count} shipments.`
            : undefined
        }
      >
        <IntensityBarList
          testID="routes-list"
          rows={data.map((r) => ({
            key: r.route,
            label: r.route,
            value: r.shipment_count,
            valueLabel: `${formatCompactNumber(r.shipment_count)} shipments`,
          }))}
        />
      </AdminWidget>
    </AdminScreenShell>
  );
}
