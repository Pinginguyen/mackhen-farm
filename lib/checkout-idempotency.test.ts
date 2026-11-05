import { describe, expect, it } from 'vitest';
import { createCheckoutFingerprint } from './checkout-idempotency';

const items = [
  { productId: 'product-b', variantId: 'variant-b', quantity: 2, price: 25000 },
  { productId: 'product-a', variantId: null, quantity: 1, price: 49000 },
];

describe('server-side checkout fingerprints', () => {
  it('is stable regardless of cart row order', () => {
    expect(createCheckoutFingerprint('user-1', items, 99000))
      .toBe(createCheckoutFingerprint('user-1', [...items].reverse(), 99000));
  });

  it('changes when the actor, cart contents, or trusted total changes', () => {
    const fingerprint = createCheckoutFingerprint('user-1', items, 99000);
    expect(createCheckoutFingerprint('user-2', items, 99000)).not.toBe(fingerprint);
    expect(createCheckoutFingerprint('user-1', items, 99001)).not.toBe(fingerprint);
    expect(createCheckoutFingerprint('user-1', [...items, { productId: 'product-c', variantId: null, quantity: 1, price: 100 }], 99100)).not.toBe(fingerprint);
  });
});
