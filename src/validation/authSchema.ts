import { phoneSchema, otpSchema, normalizePhone } from '../../src/validation/authSchema';

describe('normalizePhone', () => {
  it('strips spaces, dashes, and parens', () => {
    expect(normalizePhone('98765 43210')).toBe('9876543210');
    expect(normalizePhone('98765-43210')).toBe('9876543210');
    expect(normalizePhone('(98765) 43210')).toBe('9876543210');
  });

  it('strips a leading +91 country code', () => {
    expect(normalizePhone('+919876543210')).toBe('9876543210');
    expect(normalizePhone('919876543210')).toBe('9876543210');
  });

  it('strips a leading trunk 0', () => {
    expect(normalizePhone('09876543210')).toBe('9876543210');
  });

  it('leaves an already-clean 10-digit number unchanged', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210');
  });
});

describe('phoneSchema', () => {
  it('accepts a valid 10-digit number', () => {
    const result = phoneSchema.safeParse({ phone: '9876543210' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('9876543210');
    }
  });

  it('accepts and normalizes a number with +91 prefix', () => {
    const result = phoneSchema.safeParse({ phone: '+91 98765 43210' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('9876543210');
    }
  });

  it('rejects an empty phone', () => {
    const result = phoneSchema.safeParse({ phone: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone with too few digits', () => {
    const result = phoneSchema.safeParse({ phone: '98765' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone with too many digits', () => {
    const result = phoneSchema.safeParse({ phone: '987654321099' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone containing non-numeric characters after stripping', () => {
    const result = phoneSchema.safeParse({ phone: 'abcdefghij' });
    expect(result.success).toBe(false);
  });
});

describe('otpSchema', () => {
  it('accepts a valid 6-digit code', () => {
    expect(otpSchema.safeParse({ otp: '123456' }).success).toBe(true);
  });

  it('rejects a code shorter than 6 digits', () => {
    expect(otpSchema.safeParse({ otp: '12345' }).success).toBe(false);
  });

  it('rejects a code longer than 6 digits', () => {
    expect(otpSchema.safeParse({ otp: '1234567' }).success).toBe(false);
  });

  it('rejects a code with non-numeric characters', () => {
    expect(otpSchema.safeParse({ otp: 'abcdef' }).success).toBe(false);
  });

  it('rejects an empty code', () => {
    expect(otpSchema.safeParse({ otp: '' }).success).toBe(false);
  });
});
