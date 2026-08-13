import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  loadSchema,
  type LoadFormValues,
  CARGO_TYPES,
  CARGO_TYPE_LABELS,
  requiresHighWeightConfirmation,
} from '../../validation/loadSchema';
import { VEHICLE_TYPES, type VehicleType } from '../../validation/vehicleSchema';
import { postLoad, isLoadPostError } from '../../api/loads';
import { useLoadStore } from '../../state/loadStore';
import { LocationPicker } from '../../components/LocationPicker';
import type { GeoPoint } from '../../state/types';
import type { ShipperStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ShipperStackParamList, 'LoadPosting'>;

// Duplicated intentionally (not imported from VehicleRegistrationScreen,
// which doesn't export its copy) — both screens share the same
// `VEHICLE_TYPES` enum from `validation/vehicleSchema.ts` as the single
// source of truth for the *values*; only this display-label mapping is
// screen-local. If a third screen needs it, promote this into
// `vehicleSchema.ts` instead of copying it a third time.
const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  mini_truck: 'Mini Truck',
  pickup: 'Pickup',
  lcv: 'Light Commercial Vehicle (LCV)',
  truck: 'Truck',
  trailer: 'Trailer',
  container_truck: 'Container Truck',
};

const HAZARD_NOTE_CARGO_TYPES = new Set(['hazardous', 'refrigerated']);

/** Combines separate date (`YYYY-MM-DD`) and time (`HH:MM`) text into an
 * ISO8601 string in the device's local timezone. Returns '' if either part
 * is missing/invalid, which `loadSchema` then reports as a normal
 * validation error rather than this needing its own error path. */
function combineDeadline(dateText: string, timeText: string): string {
  if (!dateText.trim() || !timeText.trim()) return '';
  const composed = new Date(`${dateText.trim()}T${timeText.trim()}:00`);
  return Number.isNaN(composed.getTime()) ? '' : composed.toISOString();
}

const defaultValues: Partial<LoadFormValues> = {
  weightKg: undefined as unknown as number,
  cargoType: '' as unknown as LoadFormValues['cargoType'],
  source: undefined as unknown as GeoPoint,
  destination: undefined as unknown as GeoPoint,
  deadline: '',
  preferredVehicleType: '' as unknown as VehicleType,
};

export default function LoadPostingScreen({ navigation }: Props) {
  const setActiveLoadId = useLoadStore((s) => s.setActiveLoadId);
  const clearDraft = useLoadStore((s) => s.clearDraft);
  const setDraft = useLoadStore((s) => s.setDraft);
  const isPosting = useLoadStore((s) => s.isPosting);
  const setIsPosting = useLoadStore((s) => s.setIsPosting);
  const postError = useLoadStore((s) => s.postError);
  const setPostError = useLoadStore((s) => s.setPostError);

  const [dateText, setDateText] = React.useState('');
  const [timeText, setTimeText] = React.useState('');
  const [pendingHighWeightValues, setPendingHighWeightValues] =
    React.useState<LoadFormValues | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid },
  } = useForm<LoadFormValues>({
    resolver: zodResolver(loadSchema),
    mode: 'onChange',
    defaultValues,
  });

  const watchedValues = watch();
  const watchedWeight = watch('weightKg');
  const watchedCargoType = watch('cargoType');

  // Keep loadStore.draft in sync as pure UI state, so an in-progress post
  // isn't silently lost if the shipper navigates away and back (per A.2's
  // draft-vs-server-derived separation). Not debounced — setDraft is a
  // cheap local state merge, not a network call.
  //
  // Also re-triggers a FULL form validation pass after every change. This
  // is needed (not just nice-to-have): with a schema-level resolver,
  // React Hook Form's `mode: 'onChange'` reliably recomputes `isValid` on
  // every change, but doesn't reliably keep the *displayed* `errors`
  // object (specifically cross-field issues from `loadSchema`'s
  // `superRefine`, like source === destination) in sync when a LATER,
  // unrelated field changes afterward — only the field that just changed
  // gets its error entry refreshed. Calling `trigger()` (validate
  // everything, publish the complete errors map) after every change avoids
  // ever showing a stale or missing cross-field error.
  React.useEffect(() => {
    setDraft(watchedValues);
    void trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues)]);

  // Re-arm the high-weight confirmation banner if the weight changes after
  // it was already shown/confirmed, so a shipper can't confirm once at
  // 60,000kg then silently edit it up to 90,000kg without re-confirming.
  React.useEffect(() => {
    setPendingHighWeightValues(null);
  }, [watchedWeight]);

  const submitLoad = async (values: LoadFormValues) => {
    setIsPosting(true);
    setPostError(null);
    try {
      const response = await postLoad(values);
      setActiveLoadId(response.load_id);
      clearDraft();
      navigation.navigate('MatchResults', { loadId: response.load_id });
    } catch (err) {
      setPostError(isLoadPostError(err) ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const onValid = (values: LoadFormValues) => {
    if (requiresHighWeightConfirmation(values.weightKg) && !pendingHighWeightValues) {
      setPendingHighWeightValues(values);
      return;
    }
    void submitLoad(values);
  };

  const confirmHighWeightAndSubmit = () => {
    if (pendingHighWeightValues) {
      void submitLoad(pendingHighWeightValues);
    }
  };

  const cancelHighWeightConfirmation = () => {
    setPendingHighWeightValues(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Post a cargo load</Text>
      <Text style={styles.subtitle}>
        Tell us what you're shipping and we'll match you with available transporters.
      </Text>

      <Text style={styles.label}>Weight (kg)</Text>
      <Controller
        control={control}
        name="weightKg"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="e.g. 1200"
            keyboardType="numeric"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value === undefined || value === null || Number.isNaN(value) ? '' : String(value)}
            testID="load-weight-input"
            accessibilityLabel="Cargo weight in kilograms"
          />
        )}
      />
      {errors.weightKg && <Text style={styles.error}>{errors.weightKg.message}</Text>}

      <Text style={styles.label}>Cargo type</Text>
      <Controller
        control={control}
        name="cargoType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.pickerWrapper} testID="cargo-type-picker-wrapper">
            <Picker selectedValue={value} onValueChange={onChange} testID="cargo-type-picker">
              <Picker.Item label="Select a cargo type…" value="" />
              {CARGO_TYPES.map((type) => (
                <Picker.Item key={type} label={CARGO_TYPE_LABELS[type]} value={type} />
              ))}
            </Picker>
          </View>
        )}
      />
      {errors.cargoType && <Text style={styles.error}>{errors.cargoType.message}</Text>}
      {watchedCargoType && HAZARD_NOTE_CARGO_TYPES.has(watchedCargoType) && (
        <Text style={styles.infoNote} testID="cargo-type-note" accessibilityRole="text">
          Hazardous and refrigerated cargo may require extra documentation before pickup — you
          can add it after posting.
        </Text>
      )}

      <Controller
        control={control}
        name="source"
        render={({ field: { onChange, value } }) => (
          <LocationPicker
            label="Pickup location"
            value={value}
            onSelect={onChange}
            testIDPrefix="source"
            placeholder="Search for a pickup address…"
          />
        )}
      />
      {errors.source && <Text style={styles.error}>{errors.source.message ?? 'Select a pickup location.'}</Text>}

      <Controller
        control={control}
        name="destination"
        render={({ field: { onChange, value } }) => (
          <LocationPicker
            label="Destination"
            value={value}
            onSelect={onChange}
            testIDPrefix="destination"
            placeholder="Search for a destination address…"
          />
        )}
      />
      {errors.destination && (
        <Text style={styles.error}>
          {errors.destination.message ?? 'Select a destination.'}
        </Text>
      )}

      <Text style={styles.label}>Pickup deadline</Text>
      <View style={styles.deadlineRow}>
        <TextInput
          style={[styles.input, styles.deadlineInput]}
          placeholder="YYYY-MM-DD"
          value={dateText}
          onChangeText={(text) => {
            setDateText(text);
            setValue('deadline', combineDeadline(text, timeText), { shouldValidate: true });
          }}
          testID="load-deadline-date-input"
          accessibilityLabel="Pickup deadline date"
        />
        <TextInput
          style={[styles.input, styles.deadlineInput]}
          placeholder="HH:MM"
          value={timeText}
          onChangeText={(text) => {
            setTimeText(text);
            setValue('deadline', combineDeadline(dateText, text), { shouldValidate: true });
          }}
          testID="load-deadline-time-input"
          accessibilityLabel="Pickup deadline time"
        />
      </View>
      {errors.deadline && <Text style={styles.error}>{errors.deadline.message}</Text>}

      <Text style={styles.label}>Preferred vehicle type</Text>
      <Controller
        control={control}
        name="preferredVehicleType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.pickerWrapper} testID="preferred-vehicle-type-picker-wrapper">
            <Picker selectedValue={value} onValueChange={onChange} testID="preferred-vehicle-type-picker">
              <Picker.Item label="Select a vehicle type…" value="" />
              {VEHICLE_TYPES.map((type) => (
                <Picker.Item key={type} label={VEHICLE_TYPE_LABELS[type]} value={type} />
              ))}
            </Picker>
          </View>
        )}
      />
      {errors.preferredVehicleType && (
        <Text style={styles.error}>{errors.preferredVehicleType.message}</Text>
      )}

      {pendingHighWeightValues && (
        <View style={styles.confirmBanner} testID="high-weight-confirm-banner">
          <Text style={styles.confirmBannerText}>
            {pendingHighWeightValues.weightKg.toLocaleString()} kg is a large shipment. Confirm to
            continue posting it, or adjust the weight above.
          </Text>
          <View style={styles.confirmBannerActions}>
            <Pressable
              style={styles.confirmBannerButton}
              onPress={confirmHighWeightAndSubmit}
              testID="high-weight-confirm-button"
              accessibilityRole="button"
            >
              <Text style={styles.confirmBannerButtonLabel}>Confirm and post</Text>
            </Pressable>
            <Pressable
              style={styles.confirmBannerButtonSecondary}
              onPress={cancelHighWeightConfirmation}
              testID="high-weight-cancel-button"
              accessibilityRole="button"
            >
              <Text style={styles.confirmBannerButtonSecondaryLabel}>Edit weight</Text>
            </Pressable>
          </View>
        </View>
      )}

      {postError && (
        <Text style={styles.submitError} accessibilityRole="alert" testID="load-post-error-banner">
          {postError}
        </Text>
      )}

      <Pressable
        style={[styles.button, (!isValid || isPosting) && styles.buttonDisabled]}
        onPress={handleSubmit(onValid)}
        disabled={!isValid || isPosting}
        testID="load-post-submit-button"
        accessibilityRole="button"
      >
        {isPosting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonLabel}>Post load</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5B6270', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D8DBE0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#D8DBE0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  deadlineRow: { flexDirection: 'row', gap: 12 },
  deadlineInput: { flex: 1 },
  error: { color: '#B3261E', fontSize: 12, marginTop: 4 },
  infoNote: { color: '#8A6D00', fontSize: 12, marginTop: 6, lineHeight: 16 },
  submitError: { color: '#B3261E', fontSize: 13, marginTop: 16, textAlign: 'center' },
  confirmBanner: {
    backgroundColor: '#FFF6E5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0D28C',
    padding: 14,
    marginTop: 20,
  },
  confirmBannerText: { fontSize: 13, color: '#5B4600', marginBottom: 12 },
  confirmBannerActions: { flexDirection: 'row', gap: 12 },
  confirmBannerButton: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  confirmBannerButtonLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  confirmBannerButtonSecondary: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D8DBE0',
  },
  confirmBannerButtonSecondaryLabel: { color: '#1A1D21', fontSize: 13, fontWeight: '600' },
  button: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
