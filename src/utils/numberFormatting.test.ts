import { formatCompactCurrencyINR, formatCompactNumber } from './numberFormatting';

describe('formatCompactNumber', () => {
  it('leaves numbers under 1,000 as-is', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(7)).toBe('7');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('formats thousands', () => {
    expect(formatCompactNumber(1000)).toBe('1K');
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(12_400)).toBe('12.4K');
  });

  it('formats millions, including the exact 1,000,000 boundary', () => {
    expect(formatCompactNumber(1_000_000)).toBe('1M');
    expect(formatCompactNumber(1_200_000)).toBe('1.2M');
    expect(formatCompactNumber(12_400_000)).toBe('12.4M');
  });

  it('formats billions', () => {
    expect(formatCompactNumber(1_000_000_000)).toBe('1B');
    expect(formatCompactNumber(2_500_000_000)).toBe('2.5B');
  });

  it('promotes to the next unit instead of showing "1000K" / "1000M"', () => {
    expect(formatCompactNumber(999_950)).toBe('1M');
    expect(formatCompactNumber(999_950_000)).toBe('1B');
  });

  it('keeps the sign for negatives', () => {
    expect(formatCompactNumber(-1_200_000)).toBe('-1.2M');
  });

  it('renders non-finite input as 0 rather than NaN', () => {
    expect(formatCompactNumber(NaN)).toBe('0');
    expect(formatCompactNumber(Infinity)).toBe('0');
  });
});

describe('formatCompactCurrencyINR', () => {
  it('prefixes the rupee sign', () => {
    expect(formatCompactCurrencyINR(1_200_000)).toBe('₹1.2M');
    expect(formatCompactCurrencyINR(950)).toBe('₹950');
  });

  it('places the sign before the rupee symbol for negatives', () => {
    expect(formatCompactCurrencyINR(-1500)).toBe('-₹1.5K');
  });
});
