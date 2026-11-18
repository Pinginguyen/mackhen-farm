import { describe, expect, it } from 'vitest';

import { getEffectivePrice, isFlashSaleActive } from './pricing';

describe('flash sale pricing', () => {
  const deadline = new Date('2026-11-18T12:00:00.000Z');

  it('uses the promotion price before the configured deadline', () => {
    const product = { price: 65_000, originalPrice: 90_000, flashSaleEndsAt: deadline };
    expect(getEffectivePrice(product, deadline.getTime() - 1)).toBe(65_000);
    expect(isFlashSaleActive(product, deadline.getTime() - 1)).toBe(true);
  });

  it('restores the original price and expires the sale at the deadline', () => {
    const product = { price: 65_000, originalPrice: 90_000, flashSaleEndsAt: deadline };
    expect(getEffectivePrice(product, deadline.getTime())).toBe(90_000);
    expect(isFlashSaleActive(product, deadline.getTime())).toBe(false);
  });

  it('does not alter prices without a configured deadline or compare-at price', () => {
    expect(getEffectivePrice({ price: 65_000, originalPrice: 90_000 })).toBe(65_000);
    expect(getEffectivePrice({ price: 65_000, originalPrice: null, flashSaleEndsAt: deadline }, deadline.getTime())).toBe(65_000);
    expect(isFlashSaleActive({ price: 65_000, originalPrice: 90_000 })).toBe(false);
  });
});
