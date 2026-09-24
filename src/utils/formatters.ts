/**
 * Pure, presentation-only formatting helpers shared by MatchCard and
 * FareBreakdown (task D.2). Kept here rather than inline in either
 * component so both stay prop-driven and free of formatting logic, per the
 * guide's code-quality conventions for utils/.
 */

/**
 * Formats a rupee amount (already in whole rupees, not paise) as a
 * localized currency string, e.g. `formatCurrencyINR(4200)` -> "₹4,200".
 * India-first per the technical spec's confirmed market assumption.
 */
export function formatCurrencyINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a kilometer distance for display, e.g. `formatDistanceKm(12.4)`
 * -> "12.4 km". Rounds to one decimal place; whole numbers drop the
 * trailing ".0" so "50 km" reads naturally instead of "50.0 km".
 */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return '0 km';
  const rounded = Math.round(km * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} km`;
}

/**
 * Formats a `lastUpdatedAt` ISO timestamp into a "last seen" label for the
 * live-tracking screens (Task E.1) — e.g. `"Last seen 4 min ago"`. `now`
 * is an injectable parameter (defaults to `Date.now()`) purely so tests
 * don't depend on real wall-clock time.
 *
 * Kept here rather than inline in either TrackingScreen so both the
 * shipper and transporter variants render identical staleness copy, per
 * the project's shared-utility convention (formatCurrencyINR/
 * formatDistanceKm above).
 */
export function getLastSeenLabel(lastUpdatedAt: string | null, now: number = Date.now()): string {
  if (!lastUpdatedAt) return 'Not yet connected';

  const updatedAtMs = new Date(lastUpdatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) return 'Not yet connected';

  const diffMs = Math.max(0, now - updatedAtMs);
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Last seen just now';
  if (diffMinutes === 1) return 'Last seen 1 min ago';
  return `Last seen ${diffMinutes} min ago`;
}

/**
 * Formats a checkpoint update's ISO8601 timestamp for display on
 * `CheckpointTimelineScreen` (Task F.1) — e.g. "Sep 1, 2026, 8:00 AM".
 * Returns `null` (not a placeholder string) for a missing/invalid
 * timestamp so callers can decide whether to render a timestamp line at
 * all, consistent with `Timeline`'s optional `timestamp` prop.
 */
export function formatCheckpointTimestamp(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats a notification's `sent_at` ISO8601 timestamp for display on
 * `NotificationInboxScreen` (Task F.2). Same underlying format as
 * `formatCheckpointTimestamp` (both just render a generic ISO8601 string
 * the same human-readable way) — reused rather than duplicated, exposed
 * under a domain-appropriate name at each call site instead of leaving
 * F.2 code calling a function literally named "checkpoint".
 */
export const formatNotificationTimestamp = formatCheckpointTimestamp;
