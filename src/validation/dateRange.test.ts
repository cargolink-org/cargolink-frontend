import { defaultDateRange, validateDateRange } from './dateRange';

describe('validateDateRange', () => {
  it('accepts start before end', () => {
    expect(validateDateRange('2026-09-01', '2026-09-30')).toBeNull();
  });

  it('accepts start equal to end', () => {
    expect(validateDateRange('2026-09-15', '2026-09-15')).toBeNull();
  });

  it('rejects start after end', () => {
    expect(validateDateRange('2026-09-30', '2026-09-01')).toMatch(/on or before/);
  });

  it('rejects malformed or impossible dates', () => {
    expect(validateDateRange('09/01/2026', '2026-09-30')).toMatch(/YYYY-MM-DD/);
    expect(validateDateRange('2026-02-30', '2026-03-05')).toMatch(/YYYY-MM-DD/);
    expect(validateDateRange('', '')).toMatch(/YYYY-MM-DD/);
  });
});

describe('defaultDateRange', () => {
  it('spans the 30 days ending on the given day and is itself valid', () => {
    const range = defaultDateRange(new Date('2026-09-30T10:00:00Z'));
    expect(range).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(validateDateRange(range.from, range.to)).toBeNull();
  });
});
