import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export type LocationPermissionPromptStep = 'primer' | 'denied';

export interface LocationPermissionPromptProps {
  visible: boolean;
  /** Which sub-view to show. 'primer' explains WHY background location is
   * needed, before the OS dialog fires. 'denied' is shown instead of
   * closing outright when the transporter declines — a clear,
   * non-alarming explanation of the consequence rather than a dead end. */
  step: LocationPermissionPromptStep;
  /** Primer step's "Continue" action — the caller (TrackingScreen) is
   * responsible for actually requesting OS permission via
   * `location.ts`'s `requestTrackingPermissions()` and deciding, from
   * the result, whether to close this prompt or advance it to the
   * 'denied' step. This component stays presentation-only. */
  onContinue: () => void;
  /** Closes the prompt — used for the primer's "Not now" and the
   * denied-step's "OK" acknowledgement. */
  onDismiss: () => void;
}

/**
 * LocationPermissionPrompt (Task E.2).
 *
 * A plain-language "primer" shown BEFORE the OS-level permission dialog,
 * per the task's UI Requirements — cold OS dialogs without context have
 * poor grant rates and poor user understanding. If the transporter
 * declines, this switches to a non-alarming explanation of the
 * consequence instead of a dead end or repeated nagging.
 */
export function LocationPermissionPrompt({ visible, step, onContinue, onDismiss }: LocationPermissionPromptProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} testID="location-permission-prompt">
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          {step === 'primer' ? (
            <>
              <Text style={styles.title} testID="location-permission-prompt-title">
                Share your live location
              </Text>
              <Text style={styles.body} testID="location-permission-prompt-body">
                So shippers can see your delivery progress even when the app isn&apos;t open. CargoLink only
                tracks your location while a trip is active — never outside of one.
              </Text>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={onDismiss}
                  accessibilityRole="button"
                  testID="location-permission-prompt-dismiss"
                >
                  <Text style={styles.secondaryButtonLabel}>Not now</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={onContinue}
                  accessibilityRole="button"
                  testID="location-permission-prompt-continue"
                >
                  <Text style={styles.primaryButtonLabel}>Continue</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text
                style={styles.title}
                testID="location-permission-prompt-denied-title"
                accessibilityRole="alert"
              >
                Live tracking won&apos;t update while backgrounded
              </Text>
              <Text style={styles.body} testID="location-permission-prompt-denied-body">
                You can enable location access later in Settings if you change your mind — the shipper just
                won&apos;t see updates while the app is backgrounded until then.
              </Text>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.button, styles.primaryButton, styles.fullWidthButton]}
                  onPress={onDismiss}
                  accessibilityRole="button"
                  testID="location-permission-prompt-acknowledge"
                >
                  <Text style={styles.primaryButtonLabel}>OK</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 29, 33, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1D21', marginBottom: 8 },
  body: { fontSize: 14, color: '#5B6270', lineHeight: 20, marginBottom: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  fullWidthButton: { flex: 1 },
  button: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  secondaryButton: { marginRight: 8 },
  secondaryButtonLabel: { color: '#5B6270', fontSize: 14, fontWeight: '600' },
  primaryButton: { backgroundColor: '#0B5FCC' },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
