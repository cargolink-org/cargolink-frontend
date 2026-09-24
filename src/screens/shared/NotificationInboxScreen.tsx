// src/screens/shared/NotificationInboxScreen.tsx
//
// Task F.2 — persistent in-app record of notifications (source doc
// Module 4.7's SMS/email triggers, complemented here with an in-app
// source of truth since SMS/email "can be missed or filtered" — Frontend
// Implementation Guide, F.2). Reachable from both role stacks.

import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';

import { NOTIFICATION_TYPE_LABELS, type Notification } from '../../state/types';
import { markNotificationRead } from '../../api/notifications';
import { refreshNotifications } from '../../services/notifications';
import {
  useNotificationStore,
  useNotificationItems,
  useIsLoadingItems,
  useItemsError,
} from '../../state/notificationStore';
import { formatNotificationTimestamp } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errorMessages';

export default function NotificationInboxScreen() {
  const items = useNotificationItems();
  const isLoading = useIsLoadingItems();
  const fetchError = useItemsError();
  const setItemsLoading = useNotificationStore((s) => s.setItemsLoading);
  const setItemsError = useNotificationStore((s) => s.setItemsError);
  const markReadInStore = useNotificationStore((s) => s.markRead);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  // Tracks in-flight mark-as-read calls per notification id so a fast
  // double-tap can't fire two requests for the same notification.
  const [markingReadIds, setMarkingReadIds] = React.useState<Set<string>>(new Set());

  const fetchInbox = React.useCallback(
    async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setItemsLoading(true);
      }
      try {
        await refreshNotifications();
      } catch (err) {
        setItemsError(getErrorMessage(err));
      } finally {
        setIsRefreshing(false);
      }
    },
    [setItemsError, setItemsLoading]
  );

  React.useEffect(() => {
    void fetchInbox();
    // Fetch once on mount only — pull-to-refresh handles picking up new
    // arrivals after that (same pattern as F.1's shared screens).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    void fetchInbox({ isRefresh: true });
  };

  const handlePressNotification = async (notification: Notification) => {
    if (notification.read || markingReadIds.has(notification.id)) {
      return;
    }
    setMarkingReadIds((prev) => new Set(prev).add(notification.id));
    try {
      await markNotificationRead(notification.id);
      markReadInStore(notification.id);
    } catch {
      // Marking-as-read failing silently is acceptable here (unlike a
      // failed preference save, which the task spec explicitly calls out
      // — see NotificationPreferencesScreen): worst case the item just
      // stays showing as unread and the user can tap it again.
    } finally {
      setMarkingReadIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={() => void handlePressNotification(item)}
      accessibilityRole="button"
      testID={`notification-row-${item.id}`}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowTitleGroup}>
          {/* Unread state carried by a dot AND bold text/label below, not
              color alone (same accessibility principle as F.1's Timeline). */}
          {!item.read && <View style={styles.unreadDot} testID={`unread-dot-${item.id}`} />}
          <Text style={[styles.rowType, !item.read && styles.rowTypeUnread]}>
            {NOTIFICATION_TYPE_LABELS[item.type]}
          </Text>
        </View>
        {!item.read && (
          <Text style={styles.unreadLabel} testID={`unread-label-${item.id}`}>
            Unread
          </Text>
        )}
      </View>
      <Text style={styles.rowMessage}>{item.message}</Text>
      <Text style={styles.rowTimestamp}>{formatNotificationTimestamp(item.sent_at)}</Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.centered} testID="notification-inbox-loading">
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonRow} />
        ))}
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered} testID="notification-inbox-error">
        <Text style={styles.errorTitle}>Couldn&apos;t load notifications</Text>
        <Text style={styles.errorMessage}>{fetchError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void fetchInbox()}
          accessibilityRole="button"
          testID="notification-inbox-retry-button"
        >
          <Text style={styles.retryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      testID="notification-inbox-list"
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      initialNumToRender={10}
      windowSize={7}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      ListEmptyComponent={
        <View style={styles.emptyState} testID="notification-inbox-empty">
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  skeletonRow: {
    width: '100%',
    height: 72,
    borderRadius: 10,
    backgroundColor: '#EDEFF2',
    marginBottom: 12,
  },
  row: {
    borderWidth: 1,
    borderColor: '#EDEFF2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  rowUnread: { borderColor: '#0B5FCC', backgroundColor: '#F5F9FF' },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0B5FCC' },
  rowType: { fontSize: 13, fontWeight: '600', color: '#5B6270' },
  rowTypeUnread: { color: '#0B5FCC', fontWeight: '700' },
  unreadLabel: { fontSize: 11, fontWeight: '700', color: '#0B5FCC' },
  rowMessage: { fontSize: 14, color: '#1A1D21', marginBottom: 6 },
  rowTimestamp: { fontSize: 12, color: '#9AA1AC' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#5B6270' },
  errorTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#1A1D21' },
  errorMessage: { fontSize: 14, color: '#5B6270', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 160,
  },
  retryButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
