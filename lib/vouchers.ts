export const VOUCHER_CODES = ['FREESHIP', 'FREESHIP169', 'GIAM10'] as const;

export function calculateVoucherDiscount(code: string, subtotal: number, shipping: number): number | null {
  if (!code) return 0;
  if (code === 'FREESHIP') return Math.min(shipping, 35000);
  if (code === 'FREESHIP169') return shipping;
  if (code === 'GIAM10') return Math.floor(subtotal * 0.1);
  return null;
}