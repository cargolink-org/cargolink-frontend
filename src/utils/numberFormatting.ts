/**
 * Task G.2 — shared large-number formatting for every admin dashboard
 * screen. Pure and dependency-free so it is directly unit-testable.
 * Uses K / M / B (not the Indian lakh/crore convention) because the task
 * spec's own example is "1.2M"; swapping conventions later is a one-file
 * change.
 */

const UNITS: ReadonlyArray<{ divisor: number; suffix: string }> = [
  { divisor: 1e9, suffix: 'B' },
  { divisor: 1e6, suffix: 'M' },
  { divisor: 1e3, suffix: 'K' },
];

/** Rounds to one decimal and drops a trailing ".0" ("1.0" -> "1"). */
function trimDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

/**
 * `formatCompactNumber(1_200_000)` -> "1.2M"; `1_000_000` -> "1M";
 * `950` -> "950"; `999_950` -> "1M" (promoted, never "1000K").
 * Non-finite input renders as "0"; negatives keep their sign.
 */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs < 1000) {
    return `${sign}${trimDecimal(abs)}`;
  }

  for (let i = 0; i < UNITS.length; i += 1) {
    const { divisor, suffix } = UNITS[i];
    if (abs >= divisor) {
      const scaled = abs / divisor;
      // Rounding can push e.g. 999.95K to "1000K" — promote to the next unit.
      if (Math.round(scaled * 10) / 10 >= 1000 && i > 0) {
        return `${sign}${trimDecimal(abs / UNITS[i - 1].divisor)}${UNITS[i - 1].suffix}`;
      }
      return `${sign}${trimDecimal(scaled)}${suffix}`;
    }
  }
  return `${sign}${trimDecimal(abs)}`;
}

/** Compact rupee amount, e.g. `formatCompactCurrencyINR(1_250_000)` -> "₹1.3M". */
export function formatCompactCurrencyINR(value: number): string {
  const formatted = formatCompactNumber(value);
  return formatted.startsWith('-') ? `-₹${formatted.slice(1)}` : `₹${formatted}`;
}
