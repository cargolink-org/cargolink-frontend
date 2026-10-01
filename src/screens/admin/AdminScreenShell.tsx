import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AdminStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';

/**
 * Task G.2 — shared chrome for the four admin screens: title, a nav row
 * linking the four views (no bottom-tabs dependency was added; a native
 * stack + this nav row keeps the dependency list unchanged and reads
 * naturally in a desktop browser), an explicit Refresh action (per the
 * task: cache briefly, but give the operator a manual refresh), and a
 * scroll container with a max content width for wide viewports.
 */
const NAV_ITEMS: ReadonlyArray<{ route: keyof AdminStackParamList; label: string }> = [
  { route: 'DashboardOverview', label: 'Overview' },
  { route: 'RoutesHeatmap', label: 'Routes' },
  { route: 'RevenueView', label: 'Revenue' },
  { route: 'TransporterLeaderboard', label: 'Leaderboard' },
];

interface AdminScreenShellProps {
  title: string;
  active: keyof AdminStackParamList;
  /** Structural (not the per-route NativeStackNavigationProp) so all four screens can pass theirs. */
  navigation: { navigate: (route: keyof AdminStackParamList) => void };
  onRefresh: () => void;
  children: React.ReactNode;
}

export function AdminScreenShell({
  title,
  active,
  navigation,
  onRefresh,
  children,
}: AdminScreenShellProps): React.JSX.Element {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Pressable
            style={styles.refresh}
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh data"
            testID="admin-refresh"
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.nav} accessibilityRole="tablist">
          {NAV_ITEMS.map((item) => {
            const isActive = item.route === active;
            return (
              <Pressable
                key={item.route}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => navigation.navigate(item.route)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                testID={`admin-nav-${item.route}`}
              >
                <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', padding: 16 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  inner: { maxWidth: 960, width: '100%' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  navItem: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  navItemActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  navText: { color: colors.textPrimary, fontSize: 14 },
  navTextActive: { color: colors.surface, fontWeight: '600' },
  refresh: { borderColor: colors.accent, borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  refreshText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  scroll: { backgroundColor: colors.background, flex: 1 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
});

export default AdminScreenShell;
