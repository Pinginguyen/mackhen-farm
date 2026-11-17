import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cartFindUnique, productUpdateMany, productVariantUpdateMany, customerUpsert, customerCreate, userUpdate, orderFindUnique, orderFindMany, orderCount, orderFindFirst, orderCreate, orderUpdate, orderItemCreateMany, cartItemDeleteMany, productionLotFindFirst, productionLotFindMany, productionLotUpdateMany, movementCreateMany, movementFindUnique, compensationVoucherFindUnique, compensationVoucherUpdateMany, voucherFindUnique, voucherUpdateMany, affiliateFindUnique, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    cartFindUnique: vi.fn(), productUpdateMany: vi.fn(), productVariantUpdateMany: vi.fn(), customerUpsert: vi.fn(), customerCreate: vi.fn(),
    orderFindUnique: vi.fn(), orderFindMany: vi.fn(), orderCount: vi.fn(), orderFindFirst: vi.fn(), orderCreate: vi.fn(), orderUpdate: vi.fn(), orderItemCreateMany: vi.fn(), cartItemDeleteMany: vi.fn(), productionLotFindFirst: vi.fn(), productionLotFindMany: vi.fn(),
    userUpdate: vi.fn(),
    productionLotUpdateMany: vi.fn(),
    movementCreateMany: vi.fn(), movementFindUnique: vi.fn(),
    compensationVoucherFindUnique: vi.fn(), compensationVoucherUpdateMany: vi.fn(),
    voucherFindUnique: vi.fn(), voucherUpdateMany: vi.fn(),
    affiliateFindUnique: vi.fn(),
  };
  const tx = {
    cart: { findUnique: mocks.cartFindUnique },
    product: { updateMany: mocks.productUpdateMany },
    productVariant: { updateMany: mocks.productVariantUpdateMany },
    customer: { upsert: mocks.customerUpsert, create: mocks.customerCreate },
    user: { update: mocks.userUpdate },
    order: { findUnique: mocks.orderFindUnique, findMany: mocks.orderFindMany, count: mocks.orderCount, findFirst: mocks.orderFindFirst, create: mocks.orderCreate, update: mocks.orderUpdate },
    orderItem: { createMany: mocks.orderItemCreateMany },
    productionLot: { findFirst: mocks.productionLotFindFirst, findMany: mocks.productionLotFindMany, updateMany: mocks.productionLotUpdateMany },
    inventoryMovement: { createMany: mocks.movementCreateMany, findUnique: mocks.movementFindUnique },
    compensationVoucher: { findUnique: mocks.compensationVoucherFindUnique, updateMany: mocks.compensationVoucherUpdateMany },
    voucher: { findUnique: mocks.voucherFindUnique, updateMany: mocks.voucherUpdateMany },
    affiliate: { findUnique: mocks.affiliateFindUnique },
  };
  return { ...mocks, transaction: tx, prisma: { order: { findUnique: mocks.orderFindUnique, findFirst: mocks.orderFindFirst }, user: { update: mocks.userUpdate }, $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)), cartItem: { deleteMany: mocks.cartItemDeleteMany } } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/system-settings', () => ({ getSystemSettings: async () => ({ freeShippingThreshold: 500000 }) }));

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
    productVariantUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    customerUpsert.mockReset().mockResolvedValue({ id: 'customer-1' });
    customerCreate.mockReset().mockResolvedValue({ id: 'customer-1' });
    orderFindUnique.mockReset().mockResolvedValue(null);
    orderCount.mockReset().mockResolvedValue(0);
    orderFindFirst.mockReset().mockResolvedValue(null);
    productionLotFindFirst.mockReset().mockResolvedValue(null);
    productionLotFindMany.mockReset().mockResolvedValue([{ id: 'lot-default', batchCode: 'LOT-MKF-2026-001', availableQty: 100, expDate: new Date('2027-01-01T00:00:00.000Z') }]);
    productionLotUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    compensationVoucherFindUnique.mockReset().mockResolvedValue(null);
    compensationVoucherUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    voucherFindUnique.mockReset().mockImplementation(({ where: { code } }: { where: { code: string } }) => Promise.resolve(code === 'GIAM10'
      ? { id: 'voucher-giam10', code, discountType: 'PERCENTAGE', value: 10, maxDiscount: 30000, minSpend: 150000, expiresAt: null, isActive: true, freeShipping: false, firstOrderOnly: true }
      : code === 'FREESHIP'
        ? { id: 'voucher-freeship', code, discountType: 'FIXED', value: 35000, maxDiscount: null, minSpend: 250000, expiresAt: null, isActive: true, freeShipping: true, firstOrderOnly: false }
        : null));
    voucherUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    affiliateFindUnique.mockReset().mockResolvedValue(null);
    userUpdate.mockReset().mockResolvedValue({ id: 'user-1' });
    orderFindMany.mockReset().mockResolvedValue([]);
    orderCreate.mockReset().mockResolvedValue({ id: 'order-1', orderCode: 'MKF-123456', numericCode: 123456, orderStatus: 'PENDING', totalAmount: 169000 });
    orderUpdate.mockReset().mockResolvedValue({ id: 'order-1' });
    orderItemCreateMany.mockReset().mockResolvedValue({ count: 1 });
    movementCreateMany.mockReset().mockResolvedValue({ count: 1 });
    movementFindUnique.mockReset().mockResolvedValue({ id: 'movement-1' });
    cartItemDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    prisma.$transaction.mockClear();
  });

  it('limits each forwarded IP to three checkout requests per ten seconds', async () => {
    const makeRateLimitedRequest = () => new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.45' },
      body: JSON.stringify({}),
    });

    expect((await POST(makeRateLimitedRequest())).status).toBe(400);
    expect((await POST(makeRateLimitedRequest())).status).toBe(400);
    expect((await POST(makeRateLimitedRequest())).status).toBe(400);
    const limitedResponse = await POST(makeRateLimitedRequest());

    expect(limitedResponse.status).toBe(429);
    expect((await limitedResponse.json()).error.code).toBe('RATE_LIMITED');
    expect(cartFindUnique).not.toHaveBeenCalled();
  });

  it('rejects new MoMo orders before accessing the database', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customer: { name: 'Nguyen Thi A', phone: '0762793244' },
        delivery: { address: 'Lai Chau, Tam Duong, Binh Lu' },
        paymentMethod: 'MOMO',
      }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_ORDER');
    expect(cartFindUnique).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('accepts the flat checkout contract and validates submitted line prices against the cart', async () => {
    affiliateFindUnique.mockResolvedValueOnce({ affiliateCode: 'KOC_TAYBAC', commissionRate: 12, active: true });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({
        customerName: 'Buyer', phone: '0762793244', address: 'Lai Chau', paymentMethod: 'COD', discountCode: '', affiliateCode: 'koc_taybac',
        items: [{ id: 'cart-item-1', productId: 'spice-1', productSlug: 'hat-doi-rung-nep-thuong-hang', variantId: null, quantity: 1, price: 169000 }],
      }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customerName: 'Buyer', phone: '0762793244', address: 'Lai Chau', subtotal: 169000, shippingFee: 35000, grossAmount: 169000, netAmount: 204000, affiliateCode: 'KOC_TAYBAC', affiliateCommissionRate: 12 }),
    }));
    expect(movementCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ orderId: 'order-1', productId: 'spice-1', lotId: 'lot-default', type: 'ALLOCATION', delta: -1, idempotencyKey: 'allocation:order-1:cart-item-1:lot-default' })],
      skipDuplicates: true,
    }));
    expect(orderItemCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ orderId: 'order-1', lotId: 'lot-default', lotCode: 'LOT-MKF-2026-001', quantity: 1 })] });
  });

  it('rejects malformed affiliate codes before creating an order', async () => {
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customerName: 'Buyer', phone: '0762793244', address: 'Lai Chau', paymentMethod: 'COD', affiliateCode: '<script>' }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_AFFILIATE_CODE');
    expect(orderCreate).not.toHaveBeenCalled();
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
      data: expect.objectContaining({ subtotal: 169000, shippingFee: 35000, discountAmount: 16900, totalAmount: 187100 }),
    }));
    expect(orderCount).toHaveBeenCalledWith({ where: { userId: 'new-member', orderStatus: { not: 'CANCELLED' } } });
  });

  it('applies and records an admin-created fixed-amount voucher', async () => {
    voucherFindUnique.mockResolvedValueOnce({
      id: 'voucher-ban-moi', code: 'BANMOI', discountType: 'FIXED', value: 25000,
      maxDiscount: null, minSpend: 100000, expiresAt: null, isActive: true,
      freeShipping: false, firstOrderOnly: false,
    });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'BANMOI' }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ voucherCode: 'BANMOI', discountAmount: 25000, totalAmount: 179000 }) }));
    expect(voucherUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'voucher-ban-moi', isActive: true }), data: { usedCount: { increment: 1 } } }));
  });

  it('rolls back checkout when the voucher usage-limit compare-and-swap loses a race', async () => {
    voucherFindUnique.mockResolvedValueOnce({
      id: 'voucher-limited', code: 'LIMITED', discountType: 'FIXED', value: 10000,
      maxDiscount: null, minSpend: 0, expiresAt: null, isActive: true, usageLimit: 1,
      freeShipping: false, firstOrderOnly: false,
    });
    voucherUpdateMany.mockResolvedValueOnce({ count: 0 });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'LIMITED' }),
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.message).toContain('vừa được sử dụng hết');
    expect(voucherFindUnique).toHaveBeenCalledWith(expect.objectContaining({ select: expect.not.objectContaining({ usedCount: true }) }));
    expect(voucherUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ usedCount: { lt: 1 } }) }));
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('deactivates a voucher immediately after its final allowed use', async () => {
    voucherFindUnique
      .mockResolvedValueOnce({ id: 'voucher-limited', code: 'LIMITED', discountType: 'FIXED', value: 10000, maxDiscount: null, minSpend: 0, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true, usedCount: 0, usageLimit: 1, freeShipping: false, firstOrderOnly: false })
      .mockResolvedValueOnce({ usedCount: 1, usageLimit: 1 });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'LIMITED' }),
    }));

    expect(response.status).toBe(201);
    expect(voucherUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: expect.objectContaining({ usedCount: { lt: 1 } }), data: { usedCount: { increment: 1 } } }));
    expect(voucherUpdateMany).toHaveBeenNthCalledWith(2, { where: { id: 'voucher-limited', isActive: true }, data: { isActive: false } });
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
    orderFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'previous-order' });
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
      data: expect.objectContaining({ discountAmount: 84500, totalAmount: 119500 }),
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
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ subtotal: 300000, shippingFee: 35000, discountAmount: 35000, totalAmount: 300000 }) }));
    expect(orderItemCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ unitPrice: 300000, discountAllocated: 0, finalPrice: 300000 })] });
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
        idempotencyKey: 'checkout-attempt-001', grossAmount: 169000, netAmount: 204000, reconciled: false,
        checkoutFingerprint: expect.any(String),
        holdExpiresAt: expect.any(Date),
      }),
    }));
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it('reserves an active production lot and records its code on the order line', async () => {
    productionLotFindMany.mockResolvedValueOnce([{ id: 'lot-1', batchCode: 'LOT-MKF-2026-001', availableQty: 4, expDate: new Date('2027-01-01T00:00:00.000Z') }]);
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(201);
    expect(productionLotUpdateMany).toHaveBeenCalledWith({
      where: { id: 'lot-1', status: 'ACTIVE', expDate: { gt: expect.any(Date) }, availableQty: { gte: 1 } },
      data: { availableQty: { decrement: 1 } },
    });
    expect(orderItemCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ lotId: 'lot-1', lotCode: 'LOT-MKF-2026-001' })] });
    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { lotCode: 'LOT-MKF-2026-001' } });
  });

  it('splits a cart line across FEFO lots and persists each allocation on its order item', async () => {
    cartFindUnique.mockResolvedValueOnce({ items: [{
      id: 'cart-item-split', productId: 'spice-1', productVariantId: null, quantity: 3, unitPrice: 169000,
      product: { id: 'spice-1', name: 'Hạt Dổi', slug: 'hat-doi-rung-nep-thuong-hang', price: 169000, stock: 5 }, variant: null,
    }] });
    productionLotFindMany.mockResolvedValueOnce([
      { id: 'lot-soon', batchCode: 'LOT-SOON', availableQty: 1, expDate: new Date('2027-01-01T00:00:00.000Z') },
      { id: 'lot-later', batchCode: 'LOT-LATER', availableQty: 2, expDate: new Date('2027-02-01T00:00:00.000Z') },
    ]);
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(201);
    expect(orderItemCreateMany).toHaveBeenCalledWith({ data: [
      expect.objectContaining({ lotId: 'lot-soon', lotCode: 'LOT-SOON', quantity: 1, finalPrice: 169000 }),
      expect.objectContaining({ lotId: 'lot-later', lotCode: 'LOT-LATER', quantity: 2, finalPrice: 338000 }),
    ] });
    expect(movementCreateMany).toHaveBeenCalledTimes(2);
  });

  it('atomically rejects a variant checkout when conditional inventory decrement fails', async () => {
    cartFindUnique.mockResolvedValueOnce({ items: [{
      id: 'cart-item-variant', productId: 'spice-1', productVariantId: 'variant-1', productName: 'Hạt Dổi', quantity: 2,
      product: { id: 'spice-1', name: 'Hạt Dổi', slug: 'hat-doi-rung-nep-thuong-hang', price: 169000, stock: 5 },
      variant: { id: 'variant-1', title: 'Túi zip 150g', price: 169000, inventory: 1 },
    }] });
    productVariantUpdateMany.mockResolvedValueOnce({ count: 0 });

    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(productVariantUpdateMany).toHaveBeenCalledWith({
      where: { id: 'variant-1', inventory: { gte: 2 } },
      data: { inventory: { decrement: 2 } },
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INSUFFICIENT_STOCK');
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('does not sell untraceably when active lots cannot cover the requested quantity', async () => {
    productionLotFindMany.mockResolvedValueOnce([]);
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('INSUFFICIENT_STOCK');
    expect(orderItemCreateMany).not.toHaveBeenCalled();
  });

  it('returns the cached order for a repeated idempotency key without reserving stock again', async () => {
    orderFindUnique.mockResolvedValueOnce({ id: 'order-existing', orderCode: 'MKF-123456', numericCode: 123456, orderStatus: 'PENDING', totalAmount: 169000, phone: '0762793244' });
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

  it('returns the existing order for a server fingerprint match without a client key', async () => {
    orderFindFirst.mockResolvedValueOnce({
      id: 'order-fingerprint-match', orderCode: 'MKF-654321', numericCode: 654321,
      orderStatus: 'PENDING', totalAmount: 204000, paymentMethod: 'COD', phone: '0762793244',
    });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bohoch_cart=cart-1' },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ orderId: 'order-fingerprint-match', duplicate: true });
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('returns a fingerprinted retry even when its voucher was consumed by the first request', async () => {
    voucherFindUnique.mockResolvedValueOnce({
      id: 'voucher-limited', code: 'LIMITED', discountType: 'PERCENTAGE', value: 10,
      maxDiscount: 30000, minSpend: 0, expiresAt: null, isActive: true,
      usedCount: 1, usageLimit: 1, freeShipping: false, firstOrderOnly: false,
    });
    orderFindFirst.mockResolvedValueOnce({
      id: 'order-fingerprint-match', orderCode: 'MKF-654321', numericCode: 654321,
      orderStatus: 'PENDING', totalAmount: 187100, paymentMethod: 'COD', phone: '0762793244',
    });

    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'LIMITED' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ orderId: 'order-fingerprint-match', duplicate: true });
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(voucherUpdateMany).not.toHaveBeenCalled();
  });

  it('returns the persisted buy-now order when a retry arrives after its cart cookie was cleared', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'order-existing', orderCode: 'MKF-123456', numericCode: 123456, orderStatus: 'PENDING', totalAmount: 169000, paymentMethod: 'VIETQR', phone: '0762793244',
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
    expect(response.headers.get('set-cookie')).toContain('mkf_payment_MKF-123456=0762793244');
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
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ subtotal: 169000, shippingFee: 35000, totalAmount: 204000 }) }));
    expect(orderItemCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ unitPrice: 169000, discountAllocated: 0, finalPrice: 169000, titleSnapshot: 'Hạt Dổi', variantNameSnapshot: '', skuSnapshot: 'hat-doi-rung-nep-thuong-hang', lineTotal: 169000 })] });
  });

  it('allocates voucher cents exactly across immutable item snapshots', async () => {
    voucherFindUnique.mockResolvedValueOnce({
      id: 'voucher-one-cent', code: 'ONECENT', discountType: 'FIXED', value: 1,
      maxDiscount: null, minSpend: 0, expiresAt: null, isActive: true,
      freeShipping: false, firstOrderOnly: false,
    });
    cartFindUnique.mockResolvedValueOnce({ items: ['a', 'b', 'c'].map((suffix) => ({
      id: `cart-${suffix}`, productId: `product-${suffix}`, productVariantId: null, quantity: 1, unitPrice: 1,
      product: { id: `product-${suffix}`, name: `Product ${suffix}`, slug: `product-${suffix}`, price: 1, stock: 5 }, variant: null,
    })) });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: memberCookie() },
      body: JSON.stringify({ customer: { name: 'Buyer', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', voucherCode: 'ONECENT' }),
    }));

    expect(response.status).toBe(201);
    const createdItems = orderItemCreateMany.mock.calls.flatMap((call) => call[0].data);
    expect(createdItems.map((item: { discountAllocated: number; finalPrice: number }) => item.discountAllocated)).toEqual([1, 0, 0]);
    expect(createdItems.map((item: { finalPrice: number }) => item.finalPrice)).toEqual([0, 1, 1]);
  });

  it('records an order but suppresses commission attribution for the affiliate owner', async () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-with-at-least-32-characters');
    const ownerToken = createSessionToken({ userId: 'affiliate-owner', name: 'KOC', email: 'koc@example.com', role: 'AFFILIATE' });
    affiliateFindUnique.mockResolvedValueOnce({
      userId: 'affiliate-owner', affiliateCode: 'KOC_TAYBAC', commissionRate: 12, active: true,
      user: { phone: '0762793244', signupIpHash: null },
    });
    const response = await POST(new Request('https://mackhen.example/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `bohoch_cart=cart-1; ${SESSION_COOKIE}=${ownerToken}` },
      body: JSON.stringify({ customer: { name: 'KOC', phone: '0762793244' }, delivery: { address: 'Lai Chau' }, paymentMethod: 'COD', affiliateCode: 'KOC_TAYBAC' }),
    }));

    expect(response.status).toBe(201);
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ affiliateCode: null, affiliateCommissionRate: null, affiliateCommissionStatus: null }) }));
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
      items: [{ productId: 'spice-1', productVariantId: null, quantity: 1, unitPrice: 169000 }],
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
    const existingOrder = { id: 'order-winner', orderCode: 'MKF-654321', numericCode: 654321, orderStatus: 'PENDING', totalAmount: 169000, paymentMethod: 'COD', phone: '0762793244' };
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
    if (paymentMethod === 'VIETQR') {
      const cookie = response.headers.get('set-cookie') ?? '';
      expect(cookie).toContain('mkf_payment_MKF-123456=0762793244');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=lax');
      expect(cookie).toContain('Path=/api/orders/MKF-123456');
      expect(cookie).toContain('Max-Age=900');
    }
  });
});