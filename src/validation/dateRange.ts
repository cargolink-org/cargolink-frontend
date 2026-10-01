/**
 * Task G.2 — date-range validation for RevenueView's filter controls.
 * Inputs are plain `YYYY-MM-DD` strings (works identically in RN and on
 * web without a native date-picker dependency). Returns a user-facing
 * message, or `null` when the range is valid and a fetch may fire.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function validateDateRange(from: string, to: string): string | null {
  if (!isRealDate(from) || !isRealDate(to)) {
    return 'Enter dates as YYYY-MM-DD.';
  }
  if (from > to) {
    return 'Start date must be on or before the end date.';
  }
  return null;
}

/** Default range: the last 30 days, ending today (UTC). `now` is injectable for tests. */
export function defaultDateRange(now: Date = new Date()): { from: string; to: string } {
  const to = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from: start.toISOString().slice(0, 10), to };
}
