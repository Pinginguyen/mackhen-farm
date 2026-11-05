import { createHash } from 'node:crypto';

export type CheckoutFingerprintItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
};

export function createCheckoutFingerprint(actorId: string, items: CheckoutFingerprintItem[], totalAmount: number): string {
  const normalizedItems = items
    .map(({ productId, variantId, quantity, price }) => ({ productId, variantId, quantity, price }))
    .sort((left, right) => `${left.productId}:${left.variantId ?? ''}`.localeCompare(`${right.productId}:${right.variantId ?? ''}`));
  return createHash('sha256')
    .update(JSON.stringify({ actorId, items: normalizedItems, totalAmount }))
    .digest('hex');
}
