import React, { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface OtpInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
}

export default function OtpInput({
  value,
  onChangeText,
  onComplete,
  length = 6,
  disabled = false,
}: OtpInputProps) {
  const refs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (value.length === length) {
      onComplete?.(value);
    }
  }, [length, onComplete, value]);

  const setDigit = (index: number, text: string) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const chars = value.padEnd(length, '').split('').slice(0, length);
    chars[index] = digit;
    const next = chars.join('').slice(0, length);

    onChangeText(next);

    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index: number) => {
    if (!value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(input) => {
            refs.current[index] = input;
          }}
          testID={`otp-digit-${index}`}
          style={styles.input}
          value={value[index] ?? ''}
          onChangeText={(text) => setDigit(index, text)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace') {
              handleBackspace(index);
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          accessibilityLabel={`OTP digit ${index + 1}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    color: '#111827',
    fontSize: 20,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
});
