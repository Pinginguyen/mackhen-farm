export const VOUCHER_CODES = ['FREESHIP', 'GIAM10'] as const;

export function getVoucherValidationError(code: string, subtotal: number): string | null {
  if (!code) return null;
  if (code === 'FREESHIP') return subtotal < 250000 ? 'Mã FREESHIP chỉ áp dụng cho đơn từ 250.000đ trở lên.' : null;
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