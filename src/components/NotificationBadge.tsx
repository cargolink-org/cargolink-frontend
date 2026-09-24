// src/components/NotificationBadge.tsx
//
// Task F.2 — a small, reusable unread-count badge, driven entirely by
// `notificationStore.unreadCount` (never computed locally — the store is
// the single source of truth, matching this task's explicit "badge-count
// logic driven by notificationStore" requirement). Renders nothing at
// zero, so a caller can mount it unconditionally without an extra
// `unreadCount > 0 &&` guard at every call site.
//
// PLACEMENT NOTE: the task spec describes this as "a badge count on the
// relevant tab" — but no tab/bottom-navigator exists in this app yet
// (TransporterStack.tsx's own comments confirm a tab bar is deferred to
// Cluster H's UI-polish pass). Until then, this badge is used on the
// notification quick-access entry point added to both Home screens (see
// `ShipperHomeScreen.tsx` / `TransporterHomeScreen.tsx`) — the closest
// real equivalent available today. Revisit placement once a tab bar
// exists; the component itself doesn't need to change, only where it's
// mounted.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUnreadCount } from '../state/notificationStore';

export function NotificationBadge() {
  const unreadCount = useUnreadCount();

  if (unreadCount <= 0) {
    return null;
  }

  return (
    <View style={styles.badge} testID="notification-badge">
      <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#B3261E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default NotificationBadge;
