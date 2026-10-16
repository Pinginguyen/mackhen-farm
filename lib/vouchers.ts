export const VOUCHER_CODES = ['FREESHIP', 'GIAM10'] as const;

export type ManagedVoucherRule = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  expiresAt: Date | string | null;
  isActive: boolean;
  usedCount?: number;
  usageLimit?: number | null;
  freeShipping: boolean;
  firstOrderOnly?: boolean;
};

export function getManagedVoucherValidationError(voucher: ManagedVoucherRule, subtotal: number, now = new Date()): string | null {
  if (!voucher.isActive || (voucher.expiresAt && new Date(voucher.expiresAt).getTime() <= now.getTime())
    || (voucher.usageLimit != null && (voucher.usedCount ?? 0) >= voucher.usageLimit)) {
    return 'Mã giảm giá không tồn tại hoặc đã hết hạn.';
  }
  if (subtotal < voucher.minSpend) {
    const remaining = voucher.minSpend - subtotal;
    if (voucher.freeShipping) return `Cần mua thêm ${remaining.toLocaleString('vi-VN')}đ để áp dụng ${voucher.code}.`;
    if (voucher.firstOrderOnly) return `Mã ${voucher.code} chỉ áp dụng cho đơn từ ${voucher.minSpend.toLocaleString('vi-VN')}đ trở lên.`;
    return `Mã ${voucher.code} chỉ áp dụng cho đơn từ ${voucher.minSpend.toLocaleString('vi-VN')}đ trở lên. Cần mua thêm ${remaining.toLocaleString('vi-VN')}đ.`;
  }
  return null;
}

export function calculateManagedVoucherDiscount(voucher: ManagedVoucherRule, subtotal: number, shipping: number): number | null {
  if (getManagedVoucherValidationError(voucher, subtotal)) return null;
  if (voucher.freeShipping) return shipping;
  if (voucher.discountType === 'PERCENTAGE') {
    const discount = Math.floor(subtotal * voucher.value / 100);
    return voucher.maxDiscount === null ? discount : Math.min(discount, voucher.maxDiscount);
  }
  return Math.min(subtotal, voucher.value);
}

export function getVoucherValidationError(code: string, subtotal: number): string | null {
  if (!code) return null;
  if (code === 'FREESHIP') {
    const remaining = Math.max(0, 250000 - subtotal);
    return remaining ? `Cần mua thêm ${remaining.toLocaleString('vi-VN')}đ để áp dụng FREESHIP.` : null;
  }
  if (code === 'GIAM10') return subtotal < 150000 ? 'Mã GIAM10 chỉ áp dụng cho đơn từ 150.000đ trở lên.' : null;
  return 'Mã giảm giá không tồn tại hoặc đã hết hạn.';
}

export function calculateVoucherDiscount(code: string, subtotal: number, shipping: number): number | null {
  if (!code) return 0;
  if (getVoucherValidationError(code, subtotal)) return null;
  if (code === 'FREESHIP') return shipping;
  if (code === 'GIAM10') return Math.min(Math.floor(subtotal * 0.1), 30000);
  return null;
}