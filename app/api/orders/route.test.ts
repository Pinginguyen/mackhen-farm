import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cartFindUnique, productUpdateMany, customerUpsert, orderFindUnique, orderCreate, cartItemDeleteMany, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    cartFindUnique: vi.fn(), productUpdateMany: vi.fn(), customerUpsert: vi.fn(),
    orderFindUnique: vi.fn(), orderCreate: vi.fn(), cartItemDeleteMany: vi.fn(),
  };
  const tx = {
    cart: { findUnique: mocks.cartFindUnique },
    product: { updateMany: mocks.productUpdateMany },
    productVariant: { updateMany: vi.fn() },
    customer: { upsert: mocks.customerUpsert, create: vi.fn() },
    user: { update: vi.fn() },
    order: { findUnique: mocks.orderFindUnique, create: mocks.orderCreate },
  };
  return { ...mocks, transaction: tx, prisma: { $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)), cartItem: { deleteMany: mocks.cartItemDeleteMany } } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

describe('POST /api/orders checkout', () => {
  beforeEach(() => {
    cartFindUnique.mockReset().mockResolvedValue({
      items: [{
        productId: 'spice-1', productVariantId: null, productName: 'Hạt Dổi', quantity: 1, unitPrice: 169000,
        product: { slug: 'hat-doi-rung-nep-thuong-hang' }, variant: null,
      }],
    });
    productUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    customerUpsert.mockReset().mockResolvedValue({ id: 'customer-1' });
    orderFindUnique.mockReset().mockResolvedValue(null);
    orderCreate.mockReset().mockResolvedValue({ id: 'order-1', orderCode: 'MKF-123456', numericCode: 123456, orderStatus: 'PENDING', totalAmount: 169000 });
    cartItemDeleteMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it('creates a MoMo order, deducts inventory, and applies free shipping transactionally', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'Nguyen Thi A', email: 'a@example.com', phone: '0762793244' },
        delivery: { address: 'Lai Chau, Tam Duong, Binh Lu' },
        paymentMethod: 'MOMO',
        voucherCode: 'FREESHIP169',
      }),
    }));
    const result = await response.json() as { orderCode: string; total: number; status: string };

    expect(response.status).toBe(201);
    expect(result).toMatchObject({ orderCode: 'MKF-123456', total: 169000, status: 'pending' });
    expect(productUpdateMany).toHaveBeenCalledWith({ where: { id: 'spice-1', stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentMethod: 'MOMO', paymentStatus: 'PENDING', shippingFee: 0, totalAmount: 169000 }) }));
    expect(cartItemDeleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
  });

  it('rejects checkout when stock changed before the transaction', async () => {
    productUpdateMany.mockResolvedValue({ count: 0 });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'A', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(409);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('returns a demo VietQR order when Prisma is unavailable', async () => {
    const databaseError = new Error('Environment variable not found: DATABASE_URL');
    databaseError.name = 'PrismaClientInitializationError';
    cartFindUnique.mockRejectedValueOnce(databaseError);

    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'Nguyen Thi A', phone: '0762793244' },
        delivery: { address: 'Lai Chau' },
        paymentMethod: 'VIETQR',
        fallbackTotal: 169000,
      }),
    }));
    const result = await response.json() as { success: boolean; order: { code: string; total: number; paymentMethod: string }; redirectUrl: string };

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.order).toMatchObject({ total: 169000, paymentMethod: 'VIETQR' });
    expect(result.order.code).toMatch(/^MKF-\d{6}$/);
    expect(result.redirectUrl).toBe(`/checkout/vietqr/${result.order.code}?demo=1&amount=169000`);
  });

  it.each(['COD', 'VIETQR'])('creates a %s order without requiring a payment provider', async (paymentMethod) => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'A', email: 'a@example.com', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentMethod }) }));
  });
});