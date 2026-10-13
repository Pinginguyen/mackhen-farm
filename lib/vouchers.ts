export const VOUCHER_CODES = ['FREESHIP169', 'GIAM10'] as const;

export function calculateVoucherDiscount(code: string, subtotal: number, shipping: number): number | null {
  if (!code) return 0;
  if (code === 'FREESHIP169') return shipping;
  if (code === 'GIAM10') return Math.min(Math.floor(subtotal * 0.1), 30000);
  return null;
}