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

import { vehicleSchema, VehicleFormValues, VEHICLE_TYPES } from '../../validation/vehicleSchema';
import { createVehicle } from '../../api/vehicles';
import { useVehicleStore } from '../../state/vehicleStore';
// ASSUMPTION: profileStore exposes `useProfileStore` returning a state
// object with `profile.id` (the transporter's owner id). Reconcile against
// C.1's real store shape before merging.
import { useProfileStore } from '../../state/profileStore';
import type { TransporterStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TransporterStackParamList, 'VehicleRegistration'>;

const VEHICLE_TYPE_LABELS: Record<(typeof VEHICLE_TYPES)[number], string> = {
  mini_truck: 'Mini Truck',
  pickup: 'Pickup',
  lcv: 'Light Commercial Vehicle (LCV)',
  truck: 'Truck',
  trailer: 'Trailer',
  container_truck: 'Container Truck',
};

export default function VehicleRegistrationScreen({ navigation }: Props) {
  const profile = useProfileStore((s) => s.profile);
  const setVehicle = useVehicleStore((s) => s.setVehicle);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      // Cast: Picker needs a defined initial value to avoid an
      // uncontrolled -> controlled warning; '' fails the enum check and
      // surfaces the "Select a vehicle type" error, which is what we want
      // for an untouched required field.
      vehicleType: '' as unknown as VehicleFormValues['vehicleType'],
      registrationNumber: '',
      capacityWeightKg: undefined as unknown as number,
      capacityVolumeCbm: undefined as unknown as number,
      operatingCorridor: '',
    },
  });

  const onSubmit = async (values: VehicleFormValues) => {
    if (!profile?.id) {
      setSubmitError('Your profile could not be found. Please complete your profile first.');
      return;
    }
    setSubmitError(null);
    try {
      const vehicle = await createVehicle({ ...values, ownerId: profile.id });
      setVehicle(vehicle);
      navigation.navigate('DocumentUpload');
    } catch (err) {
      setSubmitError('Could not save your vehicle. Please check your connection and try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Register your vehicle</Text>
      <Text style={styles.subtitle}>
        Tell us about your vehicle so we can match you with the right loads.
      </Text>

      <Text style={styles.label}>Vehicle type</Text>
      <Controller
        control={control}
        name="vehicleType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.pickerWrapper} testID="vehicle-type-picker-wrapper">
            <Picker selectedValue={value} onValueChange={onChange} testID="vehicle-type-picker">
              <Picker.Item label="Select a vehicle type…" value="" />
              {VEHICLE_TYPES.map((type) => (
                <Picker.Item key={type} label={VEHICLE_TYPE_LABELS[type]} value={type} />
              ))}
            </Picker>
          </View>
        )}
      />
      {errors.vehicleType && <Text style={styles.error}>{errors.vehicleType.message}</Text>}

      <Text style={styles.label}>Registration number</Text>
      <Controller
        control={control}
        name="registrationNumber"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="e.g. MH12AB1234"
            autoCapitalize="characters"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            testID="registration-number-input"
          />
        )}
      />
      {errors.registrationNumber && (
        <Text style={styles.error}>{errors.registrationNumber.message}</Text>
      )}

      <Text style={styles.label}>Weight capacity (kg)</Text>
      <Controller
        control={control}
        name="capacityWeightKg"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="e.g. 3500"
            keyboardType="numeric"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value === undefined || value === null ? '' : String(value)}
            testID="capacity-weight-input"
          />
        )}
      />
      {errors.capacityWeightKg && (
        <Text style={styles.error}>{errors.capacityWeightKg.message}</Text>
      )}

      <Text style={styles.label}>Volume capacity (cbm)</Text>
      <Controller
        control={control}
        name="capacityVolumeCbm"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="e.g. 12"
            keyboardType="numeric"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value === undefined || value === null ? '' : String(value)}
            testID="capacity-volume-input"
          />
        )}
      />
      {errors.capacityVolumeCbm && (
        <Text style={styles.error}>{errors.capacityVolumeCbm.message}</Text>
      )}

      <Text style={styles.label}>Preferred route / operating corridor</Text>
      <Controller
        control={control}
        name="operatingCorridor"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="e.g. Pune–Mumbai, Maharashtra"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            testID="operating-corridor-input"
          />
        )}
      />
      {errors.operatingCorridor && (
        <Text style={styles.error}>{errors.operatingCorridor.message}</Text>
      )}

      {submitError && (
        <Text style={styles.submitError} accessibilityRole="alert">
          {submitError}
        </Text>
      )}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        testID="vehicle-submit-button"
        accessibilityRole="button"
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonLabel}>Save and continue</Text>
        )}
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
  error: { color: '#B3261E', fontSize: 12, marginTop: 4 },
  submitError: { color: '#B3261E', fontSize: 13, marginTop: 16, textAlign: 'center' },
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
