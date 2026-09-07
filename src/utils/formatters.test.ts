import { getLastSeenLabel } from './formatters';

/**
 * Only covers `getLastSeenLabel` (added for task E.1) — `formatCurrencyINR`
 * and `formatDistanceKm` predate this file and are already exercised
 * indirectly through `FareBreakdown`/`MatchCard`'s component tests; adding
 * dedicated coverage for them is outside this task's scope.
 */
describe('getLastSeenLabel', () => {
  const NOW = new Date('2026-01-01T12:00:00.000Z').getTime();

  it('returns "Not yet connected" when lastUpdatedAt is null', () => {
    expect(getLastSeenLabel(null, NOW)).toBe('Not yet connected');
  });

  it('returns "Not yet connected" for an unparsable timestamp', () => {
    expect(getLastSeenLabel('not-a-date', NOW)).toBe('Not yet connected');
  });

  it('returns "Last seen just now" for under a minute', () => {
    const thirtySecondsAgo = new Date(NOW - 30_000).toISOString();
    expect(getLastSeenLabel(thirtySecondsAgo, NOW)).toBe('Last seen just now');
  });

  it('uses singular phrasing for exactly 1 minute', () => {
    const oneMinuteAgo = new Date(NOW - 60_000).toISOString();
    expect(getLastSeenLabel(oneMinuteAgo, NOW)).toBe('Last seen 1 min ago');
  });

  it('uses plural phrasing for multiple minutes', () => {
    const fourMinutesAgo = new Date(NOW - 4 * 60_000).toISOString();
    expect(getLastSeenLabel(fourMinutesAgo, NOW)).toBe('Last seen 4 min ago');
  });

  it('floors partial minutes rather than rounding up', () => {
    const twoAndAHalfMinutesAgo = new Date(NOW - 2.9 * 60_000).toISOString();
    expect(getLastSeenLabel(twoAndAHalfMinutesAgo, NOW)).toBe('Last seen 2 min ago');
  });

  it('clamps a timestamp in the future to "just now" rather than a negative duration', () => {
    const inTheFuture = new Date(NOW + 60_000).toISOString();
    expect(getLastSeenLabel(inTheFuture, NOW)).toBe('Last seen just now');
  });

  it('defaults `now` to the current time when not provided', () => {
    const justNow = new Date().toISOString();
    expect(getLastSeenLabel(justNow)).toBe('Last seen just now');
  });
});
