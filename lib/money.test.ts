import { describe, expect, it } from 'vitest';
import { calculatePercentageAmount, convertVndToSgdCents, formatSgdCents } from './money';

describe('integer currency calculations', () => {
  it('calculates percentage amounts using integer VND arithmetic', () => {
    expect(calculatePercentageAmount(169000, 10)).toBe(16900);
    expect(calculatePercentageAmount(1, 50)).toBe(0);
    expect(calculatePercentageAmount(Number.MAX_SAFE_INTEGER, 37)).toBe(Number((BigInt(Number.MAX_SAFE_INTEGER) * 37n) / 100n));
  });

  it('rounds VND to the nearest SGD cent using integer arithmetic', () => {
    expect(convertVndToSgdCents(19000, 19000)).toBe(100);
    expect(convertVndToSgdCents(9500, 19000)).toBe(50);
    expect(convertVndToSgdCents(1, 19000)).toBe(0);
    expect(formatSgdCents(106)).toBe('1.06');
  });
});
