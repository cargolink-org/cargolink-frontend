import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../../api/auth';
import { getErrorMessage } from '../../utils/errorMessages';
import { normalizePhone, phoneSchema } from '../../validation/authSchema';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

export default function PhoneEntryScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const result = phoneSchema.safeParse({ phone });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? 'Enter a valid phone number.');
      return;
    }

    setFieldError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await requestOtp({ phone: result.data.phone });
      navigation.navigate('OtpEntry', { phone: result.data.phone });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <TextInput
        testID="phone-input"
        style={styles.input}
        value={phone}
        onChangeText={(value) => {
          setPhone(value);
          if (fieldError) {
            const parsed = phoneSchema.safeParse({ phone: value });
            setFieldError(parsed.success ? null : fieldError);
          }
        }}
        placeholder="Phone number"
        keyboardType="phone-pad"
        autoComplete="tel"
        accessibilityLabel="Phone number"
      />
      {fieldError ? (
        <Text testID="phone-field-error" style={styles.error}>
          {fieldError}
        </Text>
      ) : null}
      {submitError ? (
        <Text testID="phone-submit-error" style={styles.error}>
          {submitError}
        </Text>
      ) : null}
      <Pressable
        testID="send-otp-button"
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
      >
        {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send OTP</Text>}
      </Pressable>
      <Text style={styles.hint}>{normalizePhone(phone).length}/10 digits</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    marginBottom: 24,
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 16,
  },
  error: {
    marginTop: 8,
    color: '#B91C1C',
    fontSize: 13,
  },
  button: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 12,
  },
});
