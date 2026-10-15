import { beforeEach, describe, expect, it, vi } from 'vitest';

const { productFindFirst, productUpsert, cartUpsert, itemFindFirst, itemUpdate, itemCreate, itemDelete, itemDeleteMany, itemFindMany, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    productFindFirst: vi.fn(),
    productUpsert: vi.fn(),
    cartUpsert: vi.fn(),
    itemFindFirst: vi.fn(),
    itemUpdate: vi.fn(),
    itemCreate: vi.fn(),
    itemDelete: vi.fn(),
    itemDeleteMany: vi.fn(),
    itemFindMany: vi.fn(),
  };
  const tx = {
    cart: { upsert: mocks.cartUpsert },
    cartItem: { findFirst: mocks.itemFindFirst, update: mocks.itemUpdate, create: mocks.itemCreate, delete: mocks.itemDelete, deleteMany: mocks.itemDeleteMany },
  };
  const client = {
    $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
    product: { findFirst: mocks.productFindFirst, upsert: mocks.productUpsert },
    cartItem: { findMany: mocks.itemFindMany, deleteMany: mocks.itemDeleteMany },
  };
  return { ...mocks, transaction: tx, prisma: client };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { DELETE, PATCH, POST } from './route';

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

function request(body: object, method = 'PATCH', cookie = 'bohoch_cart=cart-1') {
  return new Request('https://mackhen.example/api/cart/items', {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/cart/items', () => {
  beforeEach(() => {
    productFindFirst.mockReset().mockResolvedValue({ ...product, slug: 'mac-khen', active: true });
    productUpsert.mockReset().mockResolvedValue({ ...product, slug: 'mac-khen', active: true });
    cartUpsert.mockReset().mockResolvedValue({ id: 'cart-1' });
    itemFindFirst.mockReset()
      .mockResolvedValueOnce({ id: 'item-1', cartId: 'cart-1', productId: 'product-1', quantity: 1, product });
    itemUpdate.mockReset().mockResolvedValue({ id: 'item-1', quantity: 2, unitPrice: 180 });
    itemCreate.mockReset().mockResolvedValue({ id: 'quick-item', quantity: 2, unitPrice: 100 });
    itemDelete.mockReset().mockResolvedValue({ id: 'item-1' });
    itemDeleteMany.mockReset().mockResolvedValue({ count: 0 });
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

describe('POST /api/cart/items buy now', () => {
  it('creates a separate quick-buy cart and leaves the regular cart cookie unchanged', async () => {
    itemFindFirst.mockReset().mockResolvedValue(null);
    const response = await POST(request(
      { productId: 'product-1', variantId: 'variant-small', quantity: 2, buyNow: true },
      'POST',
      'bohoch_cart=regular-cart',
    ));

    const result = await response.json() as { item: { quantity: number } };
    const quickCartId = cartUpsert.mock.calls[0][0].where.id as string;
    expect(response.status).toBe(200);
    expect(result.item.quantity).toBe(2);
    expect(quickCartId).not.toBe('regular-cart');
    expect(itemDeleteMany).toHaveBeenCalledWith({ where: { cartId: quickCartId } });
    expect(response.headers.get('set-cookie')).toContain('bohoch_buy_now=');
    expect(response.headers.get('set-cookie')).not.toContain('bohoch_cart=');
  });
});

describe('POST /api/cart/items regular cart', () => {
  beforeEach(() => {
    productFindFirst.mockReset().mockResolvedValue({ ...product, slug: 'mac-khen', active: true });
    cartUpsert.mockReset().mockResolvedValue({ id: 'cart-1' });
    itemFindFirst.mockReset().mockResolvedValue({ id: 'existing-item', quantity: 2 });
    itemUpdate.mockReset().mockResolvedValue({ id: 'existing-item', quantity: 4, unitPrice: 100, productVariantId: 'variant-small' });
    itemCreate.mockReset();
    itemFindMany.mockReset().mockResolvedValue([{ quantity: 4, unitPrice: 100, product: { slug: 'mac-khen' } }]);
  });

  it('adds the selected quantity to the existing product variant and returns the new cart count', async () => {
    const response = await POST(request(
      { productId: 'product-1', variantId: 'variant-small', quantity: 2 },
      'POST',
    ));
    const result = await response.json() as { item: { quantity: number }; cartCount: number };

    expect(response.status).toBe(200);
    expect(itemUpdate).toHaveBeenCalledWith({ where: { id: 'existing-item' }, data: { quantity: 4 } });
    expect(result).toMatchObject({ item: { quantity: 4 }, cartCount: 4 });
  });

  it('rejects an accumulated quantity above the selected variant stock', async () => {
    itemFindFirst.mockResolvedValueOnce({ id: 'existing-item', quantity: 4 });
    const response = await POST(request(
      { productId: 'product-1', variantId: 'variant-small', quantity: 2 },
      'POST',
    ));

    expect(response.status).toBe(409);
    expect(itemUpdate).not.toHaveBeenCalled();
    expect(itemCreate).not.toHaveBeenCalled();
  });

  it('materializes a trusted default catalog product when it is not yet in Prisma', async () => {
    productFindFirst.mockResolvedValueOnce(null);
    productUpsert.mockResolvedValueOnce({
      id: 'fallback-combo-bo-ba-nhau-xanh', slug: 'combo-bo-ba-nhau-xanh', name: 'Combo Bộ Ba Nhậu Xanh',
      price: 169000, stock: 60, active: true, variants: [],
    });
    itemFindFirst.mockResolvedValueOnce(null);
    itemCreate.mockResolvedValueOnce({ id: 'quick-item', quantity: 1, unitPrice: 169000, productId: 'fallback-combo-bo-ba-nhau-xanh', productVariantId: null });
    itemFindMany.mockResolvedValueOnce([{ quantity: 1, unitPrice: 169000, product: { slug: 'combo-bo-ba-nhau-xanh' } }]);

    const response = await POST(request({ productId: 'mkf-combo-3', quantity: 1, buyNow: true }, 'POST', ''));

    expect(response.status).toBe(200);
    expect(productUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'fallback-combo-bo-ba-nhau-xanh' },
      create: expect.objectContaining({ slug: 'combo-bo-ba-nhau-xanh', price: 169000, stock: 60 }),
    }));
  });
});

describe('DELETE /api/cart/items', () => {
  beforeEach(() => {
    itemDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    itemFindMany.mockReset().mockResolvedValue([{ quantity: 2, unitPrice: 65000, product: { slug: 'mac-khen' } }]);
  });

  it('deletes only the item belonging to the cart and returns new totals', async () => {
    const response = await DELETE(request({ itemId: 'item-1' }, 'DELETE'));
    const result = await response.json() as { cartCount: number; totals: { subtotal: number; shipping: number } };

    expect(response.status).toBe(200);
    expect(itemDeleteMany).toHaveBeenCalledWith({ where: { id: 'item-1', cartId: 'cart-1' } });
    expect(result).toMatchObject({ cartCount: 2, totals: { subtotal: 130000, shipping: 35000 } });
  });

  it('returns not found if the item is not part of the cart', async () => {
    itemDeleteMany.mockResolvedValueOnce({ count: 0 });
    const response = await DELETE(request({ itemId: 'other-item' }, 'DELETE'));
    expect(response.status).toBe(404);
    expect(itemFindMany).not.toHaveBeenCalled();
  });
});