import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp, verifyOtp } from '../../api/auth';
import OtpInput from '../../components/OtpInput';
import { getErrorMessage } from '../../utils/errorMessages';
import { otpSchema } from '../../validation/authSchema';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpEntry'>;

const RESEND_COOLDOWN_SECONDS = 30;

function formatPhone(phone: string) {
  return phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

export default function OtpEntryScreen({ route }: Props) {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  const submitOtp = async (value: string) => {
    const result = otpSchema.safeParse({ otp: value });
    if (!result.success || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await verifyOtp({ phone, otp: result.data.otp });
    } catch (submitError) {
      setOtp('');
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (cooldown > 0) return;

    try {
      await requestOtp({ phone });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setError(null);
    } catch (resendError) {
      setError(getErrorMessage(resendError));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to {formatPhone(phone)}</Text>
      <OtpInput value={otp} onChangeText={setOtp} onComplete={submitOtp} disabled={isSubmitting} />
      {error ? (
        <Text testID="otp-submit-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        testID="resend-otp-button"
        style={[styles.linkButton, cooldown > 0 && styles.linkButtonDisabled]}
        onPress={resendOtp}
        disabled={cooldown > 0}
        accessibilityRole="button"
        accessibilityState={{ disabled: cooldown > 0 }}
      >
        <Text style={styles.linkText}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</Text>
      </Pressable>
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
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: '#64748B',
    fontSize: 14,
  },
  error: {
    marginTop: 12,
    color: '#B91C1C',
    fontSize: 13,
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginTop: 20,
    paddingVertical: 8,
  },
  linkButtonDisabled: {
    opacity: 0.6,
  },
  linkText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
});
