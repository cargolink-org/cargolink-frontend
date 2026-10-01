import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessages';
import type { AdminQueryStatus } from '../screens/admin/useAdminQuery';

/**
 * Task G.2 — one independently-failing dashboard widget. Owns the four
 * states every admin widget needs (skeleton loading, per-widget error +
 * retry, empty, content) so no screen re-invents them, and so one widget's
 * failure can never blank a sibling. Prop-driven; holds no data logic.
 */
interface AdminWidgetProps {
  testID: string;
  title: string;
  status: AdminQueryStatus;
  error?: unknown;
  onRetry: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Text-equivalent of the visual (charts have poor native accessibility). */
  summary?: string;
  children?: React.ReactNode;
}

export function AdminWidget({
  testID,
  title,
  status,
  error,
  onRetry,
  isEmpty = false,
  emptyMessage = 'No data yet for this period.',
  summary,
  children,
}: AdminWidgetProps): React.JSX.Element {
  return (
    <View style={styles.card} testID={testID} accessibilityLabel={title}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>

      {status === 'loading' && (
        <View testID={`${testID}-loading`} accessibilityLabel={`Loading ${title}`}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonShort]} />
        </View>
      )}

      {status === 'error' && (
        <View testID={`${testID}-error`} accessibilityRole="alert">
          <Text style={styles.errorText}>{getErrorMessage(error)}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={`Retry loading ${title}`}
            testID={`${testID}-retry`}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {status === 'success' && isEmpty && (
        <Text style={styles.emptyText} testID={`${testID}-empty`}>
          {emptyMessage}
        </Text>
      )}

      {status === 'success' && !isEmpty && (
        <View>
          {summary ? (
            <Text style={styles.summary} testID={`${testID}-summary`} accessibilityLabel={summary}>
              {summary}
            </Text>
          ) : null}
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  errorText: { color: colors.danger, fontSize: 14, marginBottom: 8 },
  retryButton: {
    alignSelf: 'flex-start',
    borderColor: colors.accent,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  skeletonLine: { backgroundColor: colors.skeleton, borderRadius: 4, height: 16, marginBottom: 8 },
  skeletonShort: { width: '60%' },
  summary: { color: colors.textSecondary, fontSize: 13, marginBottom: 12 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
});

export default AdminWidget;
