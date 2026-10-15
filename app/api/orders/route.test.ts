import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cartFindUnique, productUpdateMany, customerUpsert, customerCreate, userUpdate, orderFindUnique, orderFindMany, orderCount, orderFindFirst, orderCreate, cartItemDeleteMany, productionLotFindFirst, productionLotUpdateMany, compensationVoucherFindUnique, compensationVoucherUpdateMany, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    cartFindUnique: vi.fn(), productUpdateMany: vi.fn(), customerUpsert: vi.fn(), customerCreate: vi.fn(),
    orderFindUnique: vi.fn(), orderFindMany: vi.fn(), orderCount: vi.fn(), orderFindFirst: vi.fn(), orderCreate: vi.fn(), cartItemDeleteMany: vi.fn(), productionLotFindFirst: vi.fn(),
    userUpdate: vi.fn(),
    productionLotUpdateMany: vi.fn(),
    compensationVoucherFindUnique: vi.fn(), compensationVoucherUpdateMany: vi.fn(),
  };
  const tx = {
    cart: { findUnique: mocks.cartFindUnique },
    product: { updateMany: mocks.productUpdateMany },
    productVariant: { updateMany: vi.fn() },
    customer: { upsert: mocks.customerUpsert, create: mocks.customerCreate },
    user: { update: mocks.userUpdate },
    order: { findUnique: mocks.orderFindUnique, findMany: mocks.orderFindMany, count: mocks.orderCount, findFirst: mocks.orderFindFirst, create: mocks.orderCreate },
    productionLot: { findFirst: mocks.productionLotFindFirst, updateMany: mocks.productionLotUpdateMany },
    compensationVoucher: { findUnique: mocks.compensationVoucherFindUnique, updateMany: mocks.compensationVoucherUpdateMany },
  };
  return { ...mocks, transaction: tx, prisma: { order: { findUnique: mocks.orderFindUnique }, user: { update: mocks.userUpdate }, $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)), cartItem: { deleteMany: mocks.cartItemDeleteMany } } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { SESSION_COOKIE, createSessionToken } from '@/lib/auth';
import { POST } from './route';

function memberCookie(cartId = 'cart-1') {
  vi.stubEnv('AUTH_SECRET', 'test-secret-with-at-least-32-characters');
  const token = createSessionToken({ userId: 'new-member', name: 'Buyer', email: 'buyer@example.com', role: 'CUSTOMER' });
  return `bohoch_cart=${cartId}; ${SESSION_COOKIE}=${token}`;
}

describe('POST /api/orders checkout', () => {
  beforeEach(() => {
    cartFindUnique.mockReset().mockResolvedValue({
      items: [{
        id: 'cart-item-1', productId: 'spice-1', productVariantId: null, productName: 'Hạt Dổi', quantity: 1, unitPrice: 169000,
        product: { id: 'spice-1', name: 'Hạt Dổi', slug: 'hat-doi-rung-nep-thuong-hang', price: 169000, stock: 5 }, variant: null,
      }],
    });
    productUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    customerUpsert.mockReset().mockResolvedValue({ id: 'customer-1' });
    customerCreate.mockReset().mockResolvedValue({ id: 'customer-1' });
    orderFindUnique.mockReset().mockResolvedValue(null);
    orderCount.mockReset().mockResolvedValue(0);
    orderFindFirst.mockReset().mockResolvedValue(null);
    productionLotFindFirst.mockReset().mockResolvedValue(null);
    productionLotUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    compensationVoucherFindUnique.mockReset().mockResolvedValue(null);
    compensationVoucherUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    userUpdate.mockReset().mockResolvedValue({ id: 'user-1' });
    orderFindMany.mockReset().mockResolvedValue([]);
    orderCreate.mockReset().mockResolvedValue({ id: 'order-1', orderCode: 'MKF-123456', numericCode: 123456, orderStatus: 'PENDING', totalAmount: 169000 });
    cartItemDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    prisma.$transaction.mockClear();
  });

  it('creates a MoMo order and leaves its cart intact until payment succeeds', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'Nguyen Thi A', email: 'a@example.com', phone: '0762793244' },
        delivery: { address: 'Lai Chau, Tam Duong, Binh Lu' },
        paymentMethod: 'MOMO',
      }),
    }));
    const result = await response.json() as { orderCode: string; total: number; status: string; success: boolean; redirectUrl: string };

    expect(response.status).toBe(201);
    expect(result).toMatchObject({ orderCode: 'MKF-123456', total: 169000, status: 'pending', success: true, redirectUrl: '/checkout/momo/MKF-123456?amount=169000' });
    expect(productUpdateMany).toHaveBeenCalledWith({ where: { id: 'spice-1', stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentMethod: 'MOMO', paymentStatus: 'PENDING', shippingFee: 0, totalAmount: 169000 }) }));
    expect(cartItemDeleteMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable', timeout: 8_000 });
  });

  it('accepts the flat checkout contract and validates submitted line prices against the cart', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customerName: 'Buyer', phone: '0762793244', address: 'Lai Chau', paymentMethod: 'COD', discountCode: '',
        items: [{ id: 'cart-item-1', productId: 'spice-1', productSlug: 'hat-doi-rung-nep-thuong-hang', variantId: null, quantity: 1, price: 169000 }],
      }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customerName: 'Buyer', phone: '0762793244', address: 'Lai Chau', subtotal: 169000, shippingFee: 0, grossAmount: 169000, netAmount: 169000 }),
    }));
  });

  it('applies GIAM10 to the merchandise subtotal for a new authenticated member', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({
        customer: { name: 'Buyer', phone: '0762793244' },
        delivery: { address: 'Lai Chau' },
        paymentMethod: 'COD',
        voucherCode: 'GIAM10',
      }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ subtotal: 169000, discountAmount: 16900, totalAmount: 152100 }),
    }));
    expect(orderCount).toHaveBeenCalledWith({ where: { userId: 'new-member', orderStatus: { not: 'CANCELLED' } } });
  });

  it('rejects promotional vouchers for guests before opening a transaction', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'GIAM10' }),
    }));

    expect(response.status).toBe(401);
    expect((await response.json()).error.message).toContain('đăng nhập hoặc tạo tài khoản');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a voucher for an account that already has an order', async () => {
    orderCount.mockResolvedValueOnce(1);
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'GIAM10' }),
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toContain('đơn hàng đầu tiên');
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('rejects a new-member voucher when the phone has a previously successful order', async () => {
    orderFindFirst.mockResolvedValueOnce({ id: 'previous-order' });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'GIAM10' }),
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toContain('Số điện thoại này đã có đơn hàng thành công');
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('rejects GIAM10 when the database cart subtotal is below its minimum', async () => {
    cartFindUnique.mockResolvedValueOnce({ items: [{
      id: 'cart-item-1', productId: 'spice-1', productVariantId: null, productName: 'Hạt Dổi', quantity: 1, unitPrice: 149999,
      product: { id: 'spice-1', name: 'Hạt Dổi', slug: 'hat-doi-rung-nep-thuong-hang', price: 149999, stock: 5 }, variant: null,
    }] });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'GIAM10' }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe('Mã GIAM10 chỉ áp dụng cho đơn từ 150.000đ trở lên.');
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('applies and consumes a valid one-time 50% compensation voucher', async () => {
    compensationVoucherFindUnique.mockResolvedValueOnce({
      id: 'voucher-1', customerPhone: '0762793244', discountPercent: 50,
      redeemedAt: null, expiresAt: new Date(Date.now() + 60_000),
    });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'MKF50-ABCDEF12' }),
    }));

    expect(response.status).toBe(201);
    expect(compensationVoucherUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'voucher-1', customerPhone: '0762793244', redeemedAt: null, expiresAt: { gt: expect.any(Date) } },
    }));
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ discountAmount: 84500, totalAmount: 84500 }),
    }));
  });

  it('rejects expired or redeemed compensation vouchers without creating an order', async () => {
    compensationVoucherFindUnique.mockResolvedValueOnce({
      id: 'voucher-used', customerPhone: '0762793244', discountPercent: 50,
      redeemedAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
    });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'MKF50-ABCDEF12' }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_VOUCHER');
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('applies FREESHIP to the server-calculated shipping fee', async () => {
    cartFindUnique.mockResolvedValueOnce({
      items: [{
        id: 'cart-item-1', productId: 'spice-1', productVariantId: null, productName: 'Hạt Dổi', quantity: 1, unitPrice: 300000,
        product: { id: 'spice-1', name: 'Hạt Dổi', slug: 'hat-doi-rung-nep-thuong-hang', price: 300000, stock: 5 }, variant: null,
      }],
    });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'FREESHIP' }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ subtotal: 300000, shippingFee: 0, discountAmount: 0, totalAmount: 300000 }),
    }));
  });

  it('attaches the authenticated account id to the created order', async () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-with-at-least-32-characters');
    const sessionToken = createSessionToken({ userId: 'user-1', name: 'Buyer', email: 'buyer@example.com', role: 'CUSTOMER' });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `bohoch_cart=cart-1; ${SESSION_COOKIE}=${sessionToken}` },
      body: JSON.stringify({ customer: { name: 'Buyer', email: 'buyer@example.com', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }));
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { name: 'Buyer', phone: '0762793244', address: 'Lai Chau' } });
    vi.unstubAllEnvs();
  });

  it('persists an idempotency key, financial totals, and a 15-minute stock hold', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1', 'idempotency-key': 'checkout-attempt-001' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        idempotencyKey: 'checkout-attempt-001', grossAmount: 169000, netAmount: 169000, reconciled: false,
        holdExpiresAt: expect.any(Date),
      }),
    }));
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it('reserves an active production lot and records its code on the order line', async () => {
    productionLotFindFirst.mockResolvedValueOnce({ id: 'lot-1', lotCode: 'LOT-MKF-2026-001' });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(201);
    expect(productionLotUpdateMany).toHaveBeenCalledWith({
      where: { id: 'lot-1', availableQty: { gte: 1 } },
      data: { availableQty: { decrement: 1 } },
    });
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lotCode: 'LOT-MKF-2026-001', items: { create: [expect.objectContaining({ lotCode: 'LOT-MKF-2026-001' })] } }),
    }));
  });

  it('does not sell untraceably when active lots cannot cover the requested quantity', async () => {
    productionLotFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'lot-1' });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INSUFFICIENT_STOCK');
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('returns the cached order for a repeated idempotency key without reserving stock again', async () => {
    orderFindUnique.mockResolvedValueOnce({ id: 'order-existing', orderCode: 'MKF-123456', numericCode: 123456, orderStatus: 'PENDING', totalAmount: 169000 });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1', 'idempotency-key': 'checkout-attempt-001' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ orderId: 'order-existing', orderCode: 'MKF-123456', duplicate: true });
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('returns the persisted buy-now order when a retry arrives after its cart cookie was cleared', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'order-existing', orderCode: 'MKF-123456', numericCode: 123456, orderStatus: 'PENDING', totalAmount: 169000, paymentMethod: 'VIETQR',
    });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'checkout-attempt-001' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'VIETQR', buyNow: true }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true, orderId: 'order-existing', orderCode: 'MKF-123456', totalAmount: 169000,
      redirectUrl: '/checkout/vietqr/MKF-123456?amount=169000', duplicate: true,
    });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(cartFindUnique).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('checks out only from the isolated buy-now cart and expires its cookie', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=regular-cart; bohoch_buy_now=quick-cart' },
      body: JSON.stringify({
        customer: { name: 'A', phone: '0762793244' },
        delivery: { address: 'Lai Chau' },
        paymentMethod: 'COD',
        buyNow: true,
        items: [{ id: 'cart-item-1', quantity: 1 }],
      }),
    }));

    expect(response.status).toBe(201);
    expect(cartFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'quick-cart' } }));
    expect(cartItemDeleteMany).toHaveBeenCalledWith({ where: { cartId: 'quick-cart' } });
    expect(response.headers.get('set-cookie')).toContain('bohoch_buy_now=');
  });

  it('rejects checkout when stock changed before the transaction', async () => {
    productUpdateMany.mockResolvedValue({ count: 0 });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'A', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain('Hạt Dổi');
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('rejects stale client prices before reserving inventory', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'A', phone: '0762793244' },
        delivery: { address: 'Lai Chau' },
        paymentMethod: 'COD',
        items: [{ id: 'cart-item-1', quantity: 1, price: 1 }],
      }),
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('PRICE_MISMATCH');
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('rejects a submitted quantity that no longer matches the database cart', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'A', phone: '0762793244' },
        delivery: { address: 'Lai Chau' },
        paymentMethod: 'COD',
        items: [{ id: 'cart-item-1', quantity: 2 }],
      }),
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('PRICE_MISMATCH');
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('calculates the order from current database prices instead of the cart price snapshot', async () => {
    cartFindUnique.mockResolvedValueOnce({
      items: [{
        id: 'cart-item-1', productId: 'spice-1', productVariantId: null, productName: 'Old cart name', quantity: 1, unitPrice: 1,
        product: { id: 'spice-1', name: 'Hạt Dổi', slug: 'hat-doi-rung-nep-thuong-hang', price: 169000, stock: 5 }, variant: null,
      }],
    });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'A', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ subtotal: 169000, totalAmount: 169000, items: { create: [expect.objectContaining({ price: 169000, lineTotal: 169000, productName: 'Hạt Dổi' })] } }),
    }));
  });

  it('rejects malformed phone values before opening a transaction', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'A', phone: 123 }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(400);
    expect(cartFindUnique).not.toHaveBeenCalled();
  });

  it('returns the existing order for an identical checkout within three seconds', async () => {
    orderFindMany.mockResolvedValueOnce([{
      id: 'order-previous', orderCode: 'MKF-123456', numericCode: 123456, orderStatus: 'PENDING', totalAmount: 169000,
      customerName: 'A', address: 'Lai Chau', paymentMethod: 'COD', discountAmount: 0,
      items: [{ productId: 'spice-1', productVariantId: null, quantity: 1, price: 169000 }],
    }]);
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'A', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ orderId: 'order-previous', orderCode: 'MKF-123456' });
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('recovers a concurrent serializable conflict with the committed idempotent order', async () => {
    const existingOrder = { id: 'order-winner', orderCode: 'MKF-654321', numericCode: 654321, orderStatus: 'PENDING', totalAmount: 169000, paymentMethod: 'COD' };
    orderFindUnique.mockReset().mockResolvedValueOnce(null).mockResolvedValueOnce(existingOrder);
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('Transaction failed due to a write conflict'), { code: 'P2034' }));

    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1', 'idempotency-key': 'checkout-race-001' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true, duplicate: true, orderCode: 'MKF-654321', redirectUrl: '/cam-on?orderCode=MKF-654321',
    });
  });

  it('returns a clear retryable error when the checkout schema is out of date', async () => {
    const databaseError = Object.assign(new Error('The column `Product.originalPrice` does not exist.'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2022',
    });
    cartFindUnique.mockRejectedValueOnce(databaseError);

    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'VIETQR' }),
    }));

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatchObject({
      code: 'DATABASE_SCHEMA_OUT_OF_DATE',
      message: expect.stringContaining('Cơ sở dữ liệu cần được cập nhật migration'),
    });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('refuses to create a client-priced VietQR order when Prisma is unavailable', async () => {
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
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
    expect((await response.json()).error.code).toBe('CHECKOUT_TEMPORARILY_UNAVAILABLE');
  });

  it('returns a retryable response when the interactive checkout transaction expires', async () => {
    const transactionError = Object.assign(new Error('Transaction not found.'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2028',
    });
    prisma.$transaction.mockRejectedValueOnce(transactionError);

    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'VIETQR' }),
    }));

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatchObject({
      code: 'CHECKOUT_TRANSACTION_TIMEOUT',
      message: expect.stringContaining('Giao dịch ghi nhận đơn vượt quá thời gian xử lý'),
    });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('refuses to create a client-priced MoMo order when the Prisma connection pool times out', async () => {
    const databaseError = Object.assign(new Error('Timed out fetching a new connection from the connection pool.'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2024',
    });
    cartFindUnique.mockRejectedValueOnce(databaseError);

    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'Nguyen Thi A', phone: '0762793244' },
        delivery: { address: 'Lai Chau' },
        paymentMethod: 'MOMO',
        fallbackTotal: 360000,
      }),
    }));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('CHECKOUT_TEMPORARILY_UNAVAILABLE');
  });

  it('does not create a MoMo payment redirect from a client-provided fallback total', async () => {
    const databaseError = new Error('Neon connection timed out');
    databaseError.name = 'PrismaClientInitializationError';
    cartFindUnique.mockRejectedValueOnce(databaseError);

    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'Nguyen Thi A', phone: '0762793244' },
        delivery: { address: 'Lai Chau' },
        paymentMethod: 'MOMO',
        fallbackTotal: 360000,
      }),
    }));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('CHECKOUT_TEMPORARILY_UNAVAILABLE');
  });

  it('does not create a COD demo order from a client-provided fallback total', async () => {
    const databaseError = new Error('PostgreSQL connection unavailable');
    databaseError.name = 'PrismaClientInitializationError';
    cartFindUnique.mockRejectedValueOnce(databaseError);
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'A', phone: '0762793244' },
        delivery: { address: 'Lai Chau' },
        paymentMethod: 'COD',
        fallbackTotal: 65000,
      }),
    }));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('CHECKOUT_TEMPORARILY_UNAVAILABLE');
  });

  it.each([[], null])('rejects an empty submitted cart (%s) before querying the database', async (items) => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=empty-cart' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', items }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('EMPTY_CART');
    expect(cartFindUnique).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
    expect(productUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects database cart quantities above 20 before reserving inventory', async () => {
    cartFindUnique.mockResolvedValueOnce({ items: [{
      id: 'cart-item-1', productId: 'spice-1', productVariantId: null, productName: 'Hạt Dổi', quantity: 21, unitPrice: 169000,
      product: { id: 'spice-1', name: 'Hạt Dổi', slug: 'hat-doi-rung-nep-thuong-hang', price: 169000, stock: 30 }, variant: null,
    }] });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_QUANTITY');
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
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