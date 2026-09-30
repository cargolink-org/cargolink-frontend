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
  // Task F.1 — role-mismatch shouldn't be reachable given the UI's
  // transporter-only gating (CheckpointTimelineScreen never renders the
  // "Update Status" action for a shipper session), but is handled
  // gracefully per the task spec if the server rejects it anyway.
  CHECKPOINT_ROLE_FORBIDDEN: 'Only the assigned transporter can update checkpoint status.',
  // Task G.1 — shouldn't be reachable given RatingForm's mount-time
  // read-only-vs-submittable check, but handled gracefully per the task
  // spec if the server rejects a submission as a duplicate anyway.
  RATING_DUPLICATE: 'You have already rated this trip.',
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
