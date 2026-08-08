import { getErrorMessage, toApiError } from '../../src/utils/errorMessages';

describe('getErrorMessage', () => {
  it('maps known error codes to friendly copy', () => {
    expect(getErrorMessage({ code: 'OTP_EXPIRED' })).toMatch(/expired/i);
    expect(getErrorMessage({ code: 'OTP_INVALID' })).toMatch(/doesn't look right/i);
    expect(getErrorMessage({ code: 'OTP_MAX_ATTEMPTS' })).toMatch(/too many/i);
    expect(getErrorMessage({ code: 'RATE_LIMITED' })).toMatch(/too often/i);
  });

  it('falls back to a generic message for unknown codes', () => {
    expect(getErrorMessage({ code: 'SOMETHING_NEW_FROM_BACKEND' })).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('falls back to a generic message for a null/undefined error', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });

  it('never echoes a raw backend message string, even if present', () => {
    const message = getErrorMessage({ code: 'UNMAPPED', message: 'raw internal stack trace' });
    expect(message).not.toMatch(/stack trace/i);
  });
});

describe('toApiError', () => {
  it('builds a well-formed ApiError', () => {
    expect(toApiError('OTP_INVALID', 400)).toEqual({ code: 'OTP_INVALID', status: 400 });
  });
});
