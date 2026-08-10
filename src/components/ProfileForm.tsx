import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  SHIPPER_TYPES,
  shipperProfileSchema,
  transporterProfileSchema,
  type ShipperProfileFormValues,
  type TransporterProfileFormValues,
} from '../validation/profileSchema';

type ShipperFormProps = {
  role: 'shipper';
  defaultValues?: Partial<ShipperProfileFormValues>;
  onSubmit: (values: ShipperProfileFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
};

type TransporterFormProps = {
  role: 'transporter';
  defaultValues?: Partial<TransporterProfileFormValues>;
  /** Read-only. Null/undefined until the backend has populated it. */
  ratingAvg?: number | null;
  onSubmit: (values: TransporterProfileFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
};

export type ProfileFormProps = ShipperFormProps | TransporterFormProps;

export function ProfileForm(props: ProfileFormProps) {
  if (props.role === 'shipper') {
    return <ShipperFields {...props} />;
  }
  return <TransporterFields {...props} />;
}

function ShipperFields({ defaultValues, onSubmit, isSubmitting, submitError }: ShipperFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ShipperProfileFormValues>({
    resolver: zodResolver(shipperProfileSchema),
    defaultValues: { shipperType: 'individual', name: '', gstin: '', ...defaultValues },
  });

  const shipperType = watch('shipperType');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Shipper type</Text>
      <Controller
        control={control}
        name="shipperType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.segmentRow}>
            {SHIPPER_TYPES.map((option) => (
              <Pressable
                key={option}
                onPress={() => onChange(option)}
                style={[styles.segment, value === option && styles.segmentActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: value === option }}
                testID={`shipper-type-${option}`}
              >
                <Text style={value === option ? styles.segmentTextActive : styles.segmentText}>
                  {option === 'individual' ? 'Individual' : 'Business'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      />

      <Text style={styles.label}>{shipperType === 'business' ? 'Company name' : 'Full name'}</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={shipperType === 'business' ? 'e.g. Acme Logistics Pvt Ltd' : 'e.g. Asha Patel'}
            autoCapitalize="words"
            testID="shipper-name-input"
          />
        )}
      />
      {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

      <Text style={styles.label}>GSTIN{shipperType === 'business' ? '' : ' (optional)'}</Text>
      <Controller
        control={control}
        name="gstin"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value ?? ''}
            onChangeText={(text) => onChange(text.toUpperCase())}
            onBlur={onBlur}
            placeholder="22AAAAA0000A1Z5"
            autoCapitalize="characters"
            maxLength={15}
            testID="shipper-gstin-input"
          />
        )}
      />
      {errors.gstin && <Text style={styles.error}>{errors.gstin.message}</Text>}

      {submitError && (
        <Text style={styles.error} testID="profile-submit-error">
          {submitError}
        </Text>
      )}

      <Pressable
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        testID="profile-submit-button"
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save profile</Text>}
      </Pressable>
    </View>
  );
}

function TransporterFields({
  defaultValues,
  ratingAvg,
  onSubmit,
  isSubmitting,
  submitError,
}: TransporterFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TransporterProfileFormValues>({
    resolver: zodResolver(transporterProfileSchema),
    defaultValues: { licenseNumber: '', ...defaultValues },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>License number</Text>
      <Controller
        control={control}
        name="licenseNumber"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => onChange(text.toUpperCase())}
            onBlur={onBlur}
            placeholder="e.g. MH-14-2024-00123"
            autoCapitalize="characters"
            testID="transporter-license-input"
          />
        )}
      />
      {errors.licenseNumber && <Text style={styles.error}>{errors.licenseNumber.message}</Text>}

      <Text style={styles.label}>Rating</Text>
      <View style={styles.readOnlyBox} testID="transporter-rating-display">
        <Text style={styles.readOnlyText}>
          {ratingAvg != null ? `${ratingAvg.toFixed(1)} / 5.0` : 'Not yet available'}
        </Text>
      </View>
      <Text style={styles.helperText}>Your rating appears here once you&apos;ve completed rated loads.</Text>

      {submitError && (
        <Text style={styles.error} testID="profile-submit-error">
          {submitError}
        </Text>
      )}

      <Pressable
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        testID="profile-submit-button"
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save profile</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6, color: '#1f2937' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { color: '#dc2626', fontSize: 13, marginTop: 4 },
  helperText: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  readOnlyBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readOnlyText: { fontSize: 16, color: '#374151' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  segmentText: { color: '#374151', fontWeight: '500' },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
