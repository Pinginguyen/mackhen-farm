import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, cartItemDeleteMany } = vi.hoisted(() => ({ orderFindUnique: vi.fn(), cartItemDeleteMany: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { order: { findUnique: orderFindUnique }, cartItem: { deleteMany: cartItemDeleteMany } } }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { POST } from './route';

describe('POST /api/orders/[orderId]/clear-cart', () => {
  beforeEach(() => {
    orderFindUnique.mockReset().mockResolvedValue({ paymentStatus: 'PAID' });
    cartItemDeleteMany.mockReset().mockResolvedValue({ count: 2 });
  });

  it('clears the current carts only after the order is paid', async () => {
    const response = await POST(new Request('https://mackhen.example/api/orders/MKF-123456/clear-cart', {
      method: 'POST',
      headers: { cookie: 'bohoch_cart=regular-cart; bohoch_buy_now=quick-cart' },
    }), { params: { orderId: 'MKF-123456' } });

    expect(response.status).toBe(200);
    expect(cartItemDeleteMany).toHaveBeenCalledWith({ where: { cartId: { in: ['regular-cart', 'quick-cart'] } } });
    expect(response.headers.get('set-cookie')).toContain('bohoch_cart=');
    expect(response.headers.get('set-cookie')).toContain('bohoch_buy_now=');
  });

  it('refuses to clear carts while payment is pending', async () => {
    orderFindUnique.mockResolvedValueOnce({ paymentStatus: 'PENDING' });
    const response = await POST(new Request('https://mackhen.example/api/orders/MKF-123456/clear-cart', { method: 'POST' }), { params: { orderId: 'MKF-123456' } });

    expect(response.status).toBe(409);
    expect(cartItemDeleteMany).not.toHaveBeenCalled();
  });
});