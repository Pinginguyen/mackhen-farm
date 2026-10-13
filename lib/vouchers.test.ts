import { describe, expect, it } from 'vitest';

import { calculateVoucherDiscount } from './vouchers';

describe('calculateVoucherDiscount', () => {
  it('waives the remaining shipping fee for FREESHIP169', () => {
    expect(calculateVoucherDiscount('FREESHIP169', 100000, 35000)).toBe(35000);
  });

  it('discounts ten percent up to 30000đ', () => {
    expect(calculateVoucherDiscount('GIAM10', 169000, 35000)).toBe(16900);
    expect(calculateVoucherDiscount('GIAM10', 500000, 35000)).toBe(30000);
  });

  it('rejects unknown vouchers', () => {
    expect(calculateVoucherDiscount('UNKNOWN', 100000, 35000)).toBeNull();
  });
});