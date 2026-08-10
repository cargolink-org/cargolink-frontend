import { z } from 'zod';

export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

export const phoneSchema = z.object({
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((value) => /^[6-9]\d{9}$/.test(value), {
      message: 'Enter a valid 10-digit phone number.',
    }),
});

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP.'),
});
