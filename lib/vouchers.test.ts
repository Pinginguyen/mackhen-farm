import { describe, expect, it } from 'vitest';

import { calculateManagedVoucherDiscount, calculateVoucherDiscount, getManagedVoucherValidationError, getVoucherValidationError } from './vouchers';

describe('calculateVoucherDiscount', () => {
  it('waives all shipping for FREESHIP only at the 250,000đ minimum', () => {
    expect(calculateVoucherDiscount('FREESHIP', 250000, 35000)).toBe(35000);
    expect(calculateVoucherDiscount('FREESHIP', 249999, 35000)).toBeNull();
    expect(getVoucherValidationError('FREESHIP', 249999)).toBe('Cần mua thêm 1đ để áp dụng FREESHIP.');
  });

  it('discounts ten percent up to 30,000đ for GIAM10 at the 150,000đ minimum', () => {
    expect(calculateVoucherDiscount('GIAM10', 169000, 35000)).toBe(16900);
    expect(calculateVoucherDiscount('GIAM10', 500000, 35000)).toBe(30000);
    expect(calculateVoucherDiscount('GIAM10', 149999, 35000)).toBeNull();
    expect(getVoucherValidationError('GIAM10', 149999)).toBe('Mã GIAM10 chỉ áp dụng cho đơn từ 150.000đ trở lên.');
  });

  it('rejects unknown vouchers', () => {
    expect(calculateVoucherDiscount('UNKNOWN', 100000, 35000)).toBeNull();
    expect(getVoucherValidationError('UNKNOWN', 300000)).toBe('Mã giảm giá không tồn tại hoặc đã hết hạn.');
  });
});

describe('managed voucher rules', () => {
  const baseVoucher = {
    code: 'SALE20',
    discountType: 'PERCENTAGE' as const,
    value: 20,
    maxDiscount: 25000,
    minSpend: 100000,
    expiresAt: null,
    isActive: true,
    freeShipping: false,
  };

  it('applies percentage discounts with the configured cap', () => {
    expect(calculateManagedVoucherDiscount(baseVoucher, 200000, 35000)).toBe(25000);
  });

  it('applies fixed discounts without exceeding the merchandise subtotal', () => {
    expect(calculateManagedVoucherDiscount({ ...baseVoucher, discountType: 'FIXED', value: 30000, maxDiscount: null, minSpend: 0 }, 20000, 35000)).toBe(20000);
  });

  it('validates minimum spend, inactive state, and expiration', () => {
    expect(getManagedVoucherValidationError(baseVoucher, 99999)).toContain('đơn từ 100.000đ trở lên');
    expect(getManagedVoucherValidationError({ ...baseVoucher, isActive: false }, 150000)).toContain('hết hạn');
    expect(getManagedVoucherValidationError({ ...baseVoucher, expiresAt: '2026-01-01T00:00:00.000Z' }, 150000, new Date('2026-02-01'))).toContain('hết hạn');
  });

  it('uses the current shipping amount for free-shipping vouchers', () => {
    expect(calculateManagedVoucherDiscount({ ...baseVoucher, freeShipping: true }, 150000, 35000)).toBe(35000);
  });
});