import { describe, expect, it } from 'vitest';

import { calculateVoucherDiscount, getVoucherValidationError } from './vouchers';

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