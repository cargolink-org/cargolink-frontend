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
