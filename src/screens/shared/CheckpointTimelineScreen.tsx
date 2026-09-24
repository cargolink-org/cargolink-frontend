// src/screens/shared/CheckpointTimelineScreen.tsx
//
// Task F.1 — checkpoint sequence stepper (source doc Module 4.5b).
// Reachable from both role stacks; the "Update Status" action is rendered
// ONLY for `role === 'transporter'` — omitted entirely (not just disabled)
// for a shipper session, per this task's explicit security requirement,
// since the real enforcement is server-side but the UI must not offer an
// unauthorized action.

import React from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { RouteProp } from '@react-navigation/native';

import { useAuthStore } from '../../state/authStore';
import {
  CHECKPOINT_NAMES,
  CHECKPOINT_NAME_LABELS,
  type CheckpointName,
} from '../../state/types';
import { checkpointUpdateSchema } from '../../validation/checkpointUpdateSchema';
import { getCheckpoints, postCheckpoint } from '../../api/checkpoints';
import { computeTimelineSteps } from '../../utils/checkpointTimeline';
import { Timeline } from '../../components/Timeline';
import {
  useLoadStore,
  useCheckpoints,
  useCheckpointsLoading,
  useCheckpointsError,
} from '../../state/loadStore';
import { getErrorMessage } from '../../utils/errorMessages';

// See DocumentChecklistScreen.tsx's Props comment for why a local, minimal
// param list is used instead of a union of both stacks' full param lists.
type CheckpointTimelineParamList = { CheckpointTimeline: { loadId: string } };
interface Props {
  route: RouteProp<CheckpointTimelineParamList, 'CheckpointTimeline'>;
}

export default function CheckpointTimelineScreen({ route }: Props) {
  const { loadId } = route.params;

  const role = useAuthStore((s) => s.role);
  const isTransporter = role === 'transporter';

  const checkpoints = useCheckpoints(loadId);
  const isLoading = useCheckpointsLoading(loadId);
  const fetchError = useCheckpointsError(loadId);
  const setCheckpoints = useLoadStore((s) => s.setCheckpoints);
  const setCheckpointsLoading = useLoadStore((s) => s.setCheckpointsLoading);
  const setCheckpointsError = useLoadStore((s) => s.setCheckpointsError);
  const appendCheckpoint = useLoadStore((s) => s.appendCheckpoint);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = React.useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = React.useState<CheckpointName>(
    CHECKPOINT_NAMES[0]
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const fetchCheckpoints = React.useCallback(
    async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setCheckpointsLoading(loadId, true);
      }
      try {
        const results = await getCheckpoints(loadId);
        setCheckpoints(loadId, results);
      } catch (err) {
        setCheckpointsError(loadId, getErrorMessage(err));
      } finally {
        setIsRefreshing(false);
      }
    },
    [loadId, setCheckpoints, setCheckpointsError, setCheckpointsLoading]
  );

  React.useEffect(() => {
    if (checkpoints === undefined) {
      void fetchCheckpoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, checkpoints === undefined]);

  const handleRefresh = () => {
    void fetchCheckpoints({ isRefresh: true });
  };

  const handleSubmitUpdate = async () => {
    // Defense-in-depth validation even though the Picker already
    // constrains the value to the enum — no free-text input exists
    // anywhere in this flow, per the task's explicit requirement. The
    // "Update Status" action always posts `'completed'` — see
    // state/types.ts's CheckpointStatus ASSUMPTION note.
    const parsed = checkpointUpdateSchema.safeParse({
      checkpoint_name: selectedCheckpoint,
      status: 'completed',
    });
    if (!parsed.success) {
      setSubmitError('Select a valid checkpoint.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await postCheckpoint(
        loadId,
        parsed.data.checkpoint_name,
        parsed.data.status
      );
      // No optimistic update — only reflect the server-confirmed result,
      // per this task's explicit "no optimistic updates" requirement.
      appendCheckpoint(loadId, {
        checkpoint_id: result.checkpoint_id,
        checkpoint_name: parsed.data.checkpoint_name,
        status: parsed.data.status,
        timestamp: new Date().toISOString(),
      });
      setIsUpdateOpen(false);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered} testID="checkpoint-timeline-loading">
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonRow} />
        ))}
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered} testID="checkpoint-timeline-error">
        <Text style={styles.errorTitle}>Couldn&apos;t load checkpoint status</Text>
        <Text style={styles.errorMessage}>{fetchError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void fetchCheckpoints()}
          accessibilityRole="button"
          testID="checkpoint-timeline-retry-button"
        >
          <Text style={styles.retryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const steps = computeTimelineSteps(checkpoints ?? []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID="checkpoint-timeline-screen"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.title}>Checkpoint status</Text>
      <Text style={styles.subtitle}>Where this shipment is in its journey.</Text>

      <Timeline steps={steps} testID="checkpoint-timeline" />

      {/* Rendered ONLY for the transporter role — omitted, not disabled,
          for a shipper session. See top-of-file comment. */}
      {isTransporter && (
        <View style={styles.updateSection}>
          {!isUpdateOpen ? (
            <Pressable
              style={styles.updateButton}
              onPress={() => setIsUpdateOpen(true)}
              accessibilityRole="button"
              testID="checkpoint-update-open-button"
            >
              <Text style={styles.updateButtonLabel}>Update status</Text>
            </Pressable>
          ) : (
            <View style={styles.updateForm} testID="checkpoint-update-form">
              <Text style={styles.updateFormLabel}>Mark checkpoint reached</Text>
              <Picker
                selectedValue={selectedCheckpoint}
                onValueChange={(value) => setSelectedCheckpoint(value as CheckpointName)}
                testID="checkpoint-name-picker"
              >
                {CHECKPOINT_NAMES.map((name) => (
                  <Picker.Item key={name} label={CHECKPOINT_NAME_LABELS[name]} value={name} />
                ))}
              </Picker>

              {submitError && <Text style={styles.error}>{submitError}</Text>}

              <View style={styles.updateFormActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsUpdateOpen(false);
                    setSubmitError(null);
                  }}
                  accessibilityRole="button"
                  testID="checkpoint-update-cancel-button"
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelButtonLabel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitButton, isSubmitting && styles.updateButtonDisabled]}
                  onPress={() => void handleSubmitUpdate()}
                  accessibilityRole="button"
                  testID="checkpoint-update-submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.updateButtonLabel}>Submit</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  skeletonRow: {
    width: '100%',
    height: 60,
    borderRadius: 10,
    backgroundColor: '#EDEFF2',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, color: '#1A1D21' },
  subtitle: { fontSize: 14, color: '#5B6270', marginBottom: 20 },
  updateSection: { marginTop: 12 },
  updateButton: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  updateButtonDisabled: { opacity: 0.6 },
  updateButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  submitButton: {
    flex: 1,
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  updateForm: {
    borderWidth: 1,
    borderColor: '#EDEFF2',
    borderRadius: 10,
    padding: 14,
  },
  updateFormLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#1A1D21' },
  updateFormActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F4F6F9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonLabel: { color: '#3A4048', fontSize: 14, fontWeight: '600' },
  error: { color: '#B3261E', fontSize: 12, marginTop: 4 },
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
