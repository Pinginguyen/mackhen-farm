import { describe, expect, it, vi } from 'vitest';

const { orderFindFirst, prisma } = vi.hoisted(() => {
  const orderFindFirst = vi.fn();
  return { orderFindFirst, prisma: { order: { findFirst: orderFindFirst } } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';
import { rememberPaidPayment } from '@/lib/payment-status-cache';

describe('GET /api/orders/[orderId]', () => {
  it('returns the payment status without exposing customer data', async () => {
    orderFindFirst.mockReset().mockResolvedValue({ orderCode: 'MKF-123456', paymentStatus: 'PAID', orderStatus: 'PAID', totalAmount: 65000 });
    const response = await GET(new Request('https://mackhen.example/api/orders/MKF-123456'), { params: { orderId: 'MKF-123456' } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ orderCode: 'MKF-123456', status: 'PAID', paymentStatus: 'PAID' });
  });

  it('returns the temporary webhook status if Prisma is offline', async () => {
    const databaseError = new Error('database offline');
    databaseError.name = 'PrismaClientInitializationError';
    orderFindFirst.mockRejectedValueOnce(databaseError);
    rememberPaidPayment({ orderCode: 'MKF-654321', amount: 45000 });

    const response = await GET(new Request('https://mackhen.example/api/orders/MKF-654321'), { params: { orderId: 'MKF-654321' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ orderCode: 'MKF-654321', status: 'PAID', paymentStatus: 'PAID', temporary: true });
  });
});