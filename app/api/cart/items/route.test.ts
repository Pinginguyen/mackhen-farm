import { beforeEach, describe, expect, it, vi } from 'vitest';

const { itemFindFirst, itemUpdate, itemDelete, itemFindMany, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    itemFindFirst: vi.fn(),
    itemUpdate: vi.fn(),
    itemDelete: vi.fn(),
    itemFindMany: vi.fn(),
  };
  const tx = { cartItem: { findFirst: mocks.itemFindFirst, update: mocks.itemUpdate, delete: mocks.itemDelete } };
  const client = {
    $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
    cartItem: { findMany: mocks.itemFindMany },
  };
  return { ...mocks, transaction: tx, prisma: client };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { PATCH } from './route';

const product = {
  id: 'product-1',
  name: 'Mắc Khén',
  price: 100,
  stock: 8,
  variants: [
    { id: 'variant-small', label: 'Gói nhỏ', price: 100, stock: 5 },
    { id: 'variant-large', label: 'Gói lớn', price: 180, stock: 2 },
  ],
};

function request(body: object) {
  return new Request('https://mackhen.example/api/cart/items', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/cart/items', () => {
  beforeEach(() => {
    itemFindFirst.mockReset()
      .mockResolvedValueOnce({ id: 'item-1', cartId: 'cart-1', productId: 'product-1', quantity: 1, product });
    itemUpdate.mockReset().mockResolvedValue({ id: 'item-1', quantity: 2, unitPrice: 180 });
    itemDelete.mockReset().mockResolvedValue({ id: 'item-1' });
    itemFindMany.mockReset().mockResolvedValue([{ quantity: 2, unitPrice: 180, product: { slug: 'mac-khen' } }]);
  });

  it('updates the selected variant and recalculates cart totals', async () => {
    const response = await PATCH(request({ itemId: 'item-1', quantity: 2, variantId: 'variant-large' }));
    const result = await response.json() as { totals: { subtotal: number; total: number } };

    expect(response.status).toBe(200);
    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { productVariantId: 'variant-large', productName: 'Mắc Khén', quantity: 2, unitPrice: 180 },
    });
    expect(result.totals).toMatchObject({ subtotal: 360, shipping: 35000, total: 35360 });
  });

  it('rejects a quantity above selected variant stock', async () => {
    const response = await PATCH(request({ itemId: 'item-1', quantity: 3, variantId: 'variant-large' }));

    expect(response.status).toBe(409);
    expect(itemUpdate).not.toHaveBeenCalled();
    expect(itemFindMany).not.toHaveBeenCalled();
  });

  it('does not update an item that does not belong to the cart cookie', async () => {
    itemFindFirst.mockReset().mockResolvedValue(null);
    const response = await PATCH(request({ itemId: 'other-cart-item', quantity: 1, variantId: 'variant-small' }));

    expect(response.status).toBe(404);
    expect(itemUpdate).not.toHaveBeenCalled();
  });
});