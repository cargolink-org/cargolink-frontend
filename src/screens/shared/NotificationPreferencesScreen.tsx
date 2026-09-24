// src/screens/shared/NotificationPreferencesScreen.tsx
//
// Task F.2 — per-category notification channel preferences (in-app/SMS/
// email). Reachable from both role stacks.
//
// Toggle behavior is optimistic-with-rollback (unlike F.1's checkpoint
// posting, which explicitly has NO optimistic update since checkpoint
// data is compliance-adjacent): a switch flips immediately on tap for a
// responsive feel, then the save fires in the background. On failure the
// switch is reverted to its prior value AND an error is shown — per this
// task's explicit requirement ("Failed preference save should not
// silently revert the toggle without telling the user why"), the revert
// is never silent.

import React from 'react';
import { View, Text, ScrollView, Switch, Pressable, StyleSheet } from 'react-native';

import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABELS,
  type NotificationType,
  type NotificationChannel,
  type NotificationPreferences,
} from '../../state/types';
import { getNotificationPreferences, updateNotificationPreferences } from '../../api/notifications';
import {
  useNotificationStore,
  useNotificationPreferences,
  useIsLoadingPreferences,
  usePreferencesError,
} from '../../state/notificationStore';
import { getErrorMessage } from '../../utils/errorMessages';

export default function NotificationPreferencesScreen() {
  const preferences = useNotificationPreferences();
  const isLoading = useIsLoadingPreferences();
  const fetchError = usePreferencesError();
  const setPreferences = useNotificationStore((s) => s.setPreferences);
  const setPreferencesLoading = useNotificationStore((s) => s.setPreferencesLoading);
  const setPreferencesError = useNotificationStore((s) => s.setPreferencesError);

  // Per-toggle save error, keyed "type:channel" — kept separate from the
  // fetch error above so a failed save on one switch doesn't blank the
  // whole screen the way a fetch failure does.
  const [saveErrors, setSaveErrors] = React.useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = React.useState<Set<string>>(new Set());

  const fetchPreferences = React.useCallback(async () => {
    setPreferencesLoading(true);
    try {
      const result = await getNotificationPreferences();
      setPreferences(result);
    } catch (err) {
      setPreferencesError(getErrorMessage(err));
    }
  }, [setPreferences, setPreferencesError, setPreferencesLoading]);

  React.useEffect(() => {
    if (!preferences) {
      void fetchPreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (type: NotificationType, channel: NotificationChannel) => {
    if (!preferences) return;
    const key = `${type}:${channel}`;
    const previousValue = preferences[type][channel];
    const optimistic: NotificationPreferences = {
      ...preferences,
      [type]: { ...preferences[type], [channel]: !previousValue },
    };

    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSavingKeys((prev) => new Set(prev).add(key));
    setPreferences(optimistic); // optimistic

    try {
      const confirmed = await updateNotificationPreferences(optimistic);
      setPreferences(confirmed);
    } catch (err) {
      // Revert — and never silently: the error message stays visible
      // under this exact row until the user retries.
      setPreferences(preferences);
      setSaveErrors((prev) => ({ ...prev, [key]: getErrorMessage(err) }));
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered} testID="notification-preferences-loading">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonSection} />
        ))}
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered} testID="notification-preferences-error">
        <Text style={styles.errorTitle}>Couldn&apos;t load preferences</Text>
        <Text style={styles.errorMessage}>{fetchError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void fetchPreferences()}
          accessibilityRole="button"
          testID="notification-preferences-retry-button"
        >
          <Text style={styles.retryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="notification-preferences-screen">
      <Text style={styles.title}>Notification preferences</Text>
      <Text style={styles.subtitle}>Choose how you want to hear about each kind of update.</Text>

      {NOTIFICATION_TYPES.map((type) => (
        <View key={type} style={styles.section} testID={`preferences-section-${type}`}>
          <Text style={styles.sectionTitle}>{NOTIFICATION_TYPE_LABELS[type]}</Text>
          {NOTIFICATION_CHANNELS.map((channel) => {
            const key = `${type}:${channel}`;
            return (
              <View key={channel} style={styles.channelRow}>
                <Text style={styles.channelLabel}>{NOTIFICATION_CHANNEL_LABELS[channel]}</Text>
                <Switch
                  testID={`preference-toggle-${type}-${channel}`}
                  value={preferences[type][channel]}
                  onValueChange={() => void handleToggle(type, channel)}
                  disabled={savingKeys.has(key)}
                  trackColor={{ true: '#0B5FCC', false: '#DDE1E6' }}
                />
              </View>
            );
          })}
          {NOTIFICATION_CHANNELS.map((channel) => {
            const key = `${type}:${channel}`;
            return saveErrors[key] ? (
              <Text key={key} style={styles.saveError} testID={`preference-error-${key}`}>
                {NOTIFICATION_CHANNEL_LABELS[channel]}: {saveErrors[key]}
              </Text>
            ) : null;
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  skeletonSection: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#EDEFF2',
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, color: '#1A1D21' },
  subtitle: { fontSize: 14, color: '#5B6270', marginBottom: 20 },
  section: {
    borderWidth: 1,
    borderColor: '#EDEFF2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1D21', marginBottom: 8 },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  channelLabel: { fontSize: 14, color: '#3A4048' },
  saveError: { color: '#B3261E', fontSize: 12, marginTop: 4 },
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
