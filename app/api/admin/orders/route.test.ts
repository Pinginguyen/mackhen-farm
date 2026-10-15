import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindMany, orderFindUnique, orderUpdate, requireAdmin } = vi.hoisted(() => ({
  orderFindMany: vi.fn(),
  orderFindUnique: vi.fn(),
  orderUpdate: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { order: { findMany: orderFindMany, findUnique: orderFindUnique, update: orderUpdate } } }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));

import { GET, PATCH } from './route';

describe('/api/admin/orders', () => {
  beforeEach(() => {
    orderFindMany.mockReset().mockResolvedValue([]);
    orderFindUnique.mockReset().mockResolvedValue({ orderStatus: 'PENDING', deliveredAt: null });
    orderUpdate.mockReset().mockResolvedValue({ orderCode: 'MKF-100001', orderStatus: 'SHIPPING' });
    requireAdmin.mockReset().mockResolvedValue(null);
  });

  it('filters by order/customer/phone, pending state, payment, and date range', async () => {
    const response = await GET(new Request('https://mackhen.example/api/admin/orders?q=linh&status=PENDING&paymentMethod=COD&from=2026-10-01&to=2026-10-02'));

    expect(response.status).toBe(200);
    expect(orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { OR: [
            { orderCode: { contains: 'linh', mode: 'insensitive' } },
            { customerName: { contains: 'linh', mode: 'insensitive' } },
            { phone: { contains: 'linh' } },
          ] },
          { OR: [
            { orderStatus: { in: ['PENDING', 'CONFIRMED'] } },
            { paymentStatus: 'PENDING', orderStatus: { not: 'CANCELLED' } },
          ] },
        ],
        paymentMethod: 'COD',
        createdAt: { gte: new Date('2026-10-01T00:00:00.000Z'), lt: new Date('2026-10-03T00:00:00.000Z') },
      },
    }));
  });

  it('filters paid and return-request workflow tabs without a fixed take limit', async () => {
    await GET(new Request('https://mackhen.example/api/admin/orders?status=PAID'));
    expect(orderFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { AND: [{ paymentStatus: 'PAID' }] } }));
    expect(orderFindMany.mock.lastCall?.[0]).not.toHaveProperty('take');

    await GET(new Request('https://mackhen.example/api/admin/orders?status=RETURNS'));
    expect(orderFindMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { AND: [{ OR: [{ warrantyRequest: { is: { status: 'OPEN' } } }, { returnRequests: { some: { status: 'PENDING' } } }] }] },
    }));
  });

  it('accepts Viettel Post when handing an order to shipping', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: ' mkf-100001 ', status: 'SHIPPING', carrier: 'VIETTEL_POST', trackingCode: 'VT12345' }),
    }));

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { orderCode: 'MKF-100001' },
      data: expect.objectContaining({ orderStatus: 'SHIPPING', carrier: 'VIETTEL_POST', trackingCode: 'VT12345', deliveredAt: null }),
    });
  });

  it('generates an SPX tracking code when handing an order to 3PL', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/orders', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'MKF-100001', status: 'HANDED_OFF', carrier: 'SPX' }),
    }));

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ orderStatus: 'HANDED_OFF', carrier: 'SPX', trackingCode: expect.stringMatching(/^SPX\d{11}$/) }),
    }));
  });
});