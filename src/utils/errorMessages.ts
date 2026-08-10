export interface ApiError {
  code?: string;
  status?: number;
}

const DEFAULT_ERROR = 'Something went wrong. Please try again.';

const ERROR_MESSAGES: Record<string, string> = {
  OTP_EXPIRED: 'That OTP has expired. Please request a new one.',
  OTP_INVALID: "That OTP doesn't look right. Please try again.",
  OTP_MAX_ATTEMPTS: 'Too many attempts. Please request a new OTP.',
  RATE_LIMITED: 'You are requesting OTPs too often. Please wait a moment.',
};

export function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return DEFAULT_ERROR;
  }

  const code = 'code' in error ? String((error as ApiError).code) : '';
  return ERROR_MESSAGES[code] ?? DEFAULT_ERROR;
}

export function toApiError(code: string, status?: number): ApiError {
  return { code, status };
}
