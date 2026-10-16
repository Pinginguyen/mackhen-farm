import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderCount, orderFindFirst, cartFindUnique, voucherFindUnique } = vi.hoisted(() => {
  const orderCount = vi.fn();
  const orderFindFirst = vi.fn();
  const cartFindUnique = vi.fn();
  const voucherFindUnique = vi.fn();
  return { orderCount, orderFindFirst, cartFindUnique, voucherFindUnique };
});

vi.mock('@/lib/prisma', () => ({ prisma: {
  order: { count: orderCount, findFirst: orderFindFirst },
  cart: { findUnique: cartFindUnique },
  voucher: { findUnique: voucherFindUnique },
  compensationVoucher: { findUnique: vi.fn() },
} }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { SESSION_COOKIE, createSessionToken } from '@/lib/auth';
import { POST } from './route';

function memberCookie() {
  vi.stubEnv('AUTH_SECRET', 'test-secret-with-at-least-32-characters');
  const token = createSessionToken({ userId: 'new-member', name: 'Buyer', email: 'buyer@example.com', role: 'CUSTOMER' });
  return `${SESSION_COOKIE}=${token}; bohoch_cart=cart-1`;
}

function request(code: string, cookie?: string) {
  return new Request('https://mackhen.example/api/checkout/voucher', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ voucherCode: code, phone: '0762793244' }),
  });
}

describe('POST /api/checkout/voucher', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    orderCount.mockReset().mockResolvedValue(0);
    orderFindFirst.mockReset().mockResolvedValue(null);
    voucherFindUnique.mockReset().mockImplementation(({ where: { code } }: { where: { code: string } }) => Promise.resolve(code === 'GIAM10'
      ? { code, discountType: 'PERCENTAGE', value: 10, maxDiscount: 30000, minSpend: 150000, expiresAt: null, isActive: true, freeShipping: false, firstOrderOnly: true }
      : code === 'FREESHIP'
        ? { code, discountType: 'FIXED', value: 35000, maxDiscount: null, minSpend: 250000, expiresAt: null, isActive: true, freeShipping: true, firstOrderOnly: false }
        : null));
    cartFindUnique.mockReset().mockResolvedValue({ items: [{ quantity: 1, product: { price: 169000, slug: 'hat-doi-rung-nep-thuong-hang' }, variant: null }] });
  });

  it('requires a signed-in account before applying promotional vouchers', async () => {
    const response = await POST(request('GIAM10', 'bohoch_cart=cart-1'));

    expect(response.status).toBe(401);
    expect((await response.json()).error.message).toContain('Vui lòng đăng nhập hoặc tạo tài khoản');
    expect(orderCount).not.toHaveBeenCalled();
  });

  it('previews a valid first-order GIAM10 from the database cart', async () => {
    const response = await POST(request('GIAM10', memberCookie()));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ code: 'GIAM10', discount: 16900, subtotal: 169000, shipping: 0 });
    expect(orderCount).toHaveBeenCalledWith({ where: { userId: 'new-member', orderStatus: { not: 'CANCELLED' } } });
  });

  it('rejects accounts that already placed an order', async () => {
    orderCount.mockResolvedValueOnce(1);
    const response = await POST(request('GIAM10', memberCookie()));

    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toContain('đơn hàng đầu tiên');
    expect(cartFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a phone number used by a previously successful order', async () => {
    orderFindFirst.mockResolvedValueOnce({ id: 'previous-order' });
    const response = await POST(request('GIAM10', memberCookie()));

    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toContain('Số điện thoại này đã có đơn hàng thành công');
    expect(cartFindUnique).not.toHaveBeenCalled();
  });

  it('rejects FREESHIP below its minimum using the database subtotal', async () => {
    const response = await POST(request('FREESHIP', memberCookie()));

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe('Cần mua thêm 81.000đ để áp dụng FREESHIP.');
  });

  it('reports the exact 10,000 VND shortfall for a 240,000 VND cart', async () => {
    cartFindUnique.mockResolvedValueOnce({ items: [{ quantity: 1, product: { price: 240000, slug: 'hat-doi-rung-nep-thuong-hang' }, variant: null }] });
    const response = await POST(request('FREESHIP', memberCookie()));

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe('Cần mua thêm 10.000đ để áp dụng FREESHIP.');
  });
});