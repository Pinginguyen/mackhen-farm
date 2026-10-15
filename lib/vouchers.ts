export const VOUCHER_CODES = ['FREESHIP', 'GIAM10'] as const;

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