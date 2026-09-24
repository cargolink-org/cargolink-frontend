import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import type { ShipperStackParamList } from '../../navigation/types';
import { NotificationBadge } from '../../components/NotificationBadge';

export function ShipperHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ShipperStackParamList>>();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Shipper Home — Placeholder</Text>
      {/* Task F.2 — no tab bar exists yet to carry a badge (see
          NotificationBadge.tsx's placement note), so notifications are
          reached from this quick-access button until Cluster H adds one. */}
      <Pressable
        style={styles.notificationsButton}
        onPress={() => navigation.navigate('NotificationInbox')}
        accessibilityRole="button"
        testID="home-notifications-button"
      >
        <Text style={styles.notificationsButtonLabel}>Notifications</Text>
        <NotificationBadge />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  label: {
    fontSize: 16,
    color: '#1A1D21',
  },
  notificationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4F6F9',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  notificationsButtonLabel: {
    color: '#3A4048',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ShipperHomeScreen;
