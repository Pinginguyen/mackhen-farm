import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, paymentUpdate, orderUpdate, transaction } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  paymentUpdate: vi.fn(),
  orderUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: orderFindUnique, update: orderUpdate },
    payment: { update: paymentUpdate },
    $transaction: transaction,
  },
}));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { POST } from './route';

const pendingOrder = (paymentMethod: 'VIETQR' | 'MOMO' = 'VIETQR') => ({
  id: 'order-1',
  orderCode: 'MKF-556213',
  paymentMethod,
  paymentStatus: 'PENDING',
  orderStatus: 'PENDING',
  payments: [{ id: 'payment-1', status: 'PENDING', createdAt: new Date() }],
});

function request() {
  return new Request('https://mackhen.example/api/orders/MKF-556213/confirm-payment', { method: 'POST' });
}

describe('POST /api/orders/[orderId]/confirm-payment', () => {
  beforeEach(() => {
    orderFindUnique.mockReset().mockResolvedValue(pendingOrder());
    paymentUpdate.mockReset();
    orderUpdate.mockReset();
    transaction.mockReset().mockResolvedValue([]);
  });

  it('does not mark a VietQR order paid from a client button click', async () => {
    const response = await POST(request(), { params: { orderId: 'MKF-556213' } });
    const result = await response.json() as { confirmed: boolean; message: string };

    expect(response.status).toBe(202);
    expect(result.confirmed).toBe(false);
    expect(result.message).toContain('PayOS xác minh');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns confirmed only when the server already has verified payment status', async () => {
    orderFindUnique.mockResolvedValue({
      ...pendingOrder(),
      paymentStatus: 'PAID',
      payments: [{ id: 'payment-1', status: 'PAID', createdAt: new Date() }],
    });
    const response = await POST(request(), { params: { orderId: 'MKF-556213' } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ confirmed: true });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('keeps the explicit MoMo sandbox confirmation behavior', async () => {
    orderFindUnique.mockResolvedValue(pendingOrder('MOMO'));
    const response = await POST(request(), { params: { orderId: 'MKF-556213' } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ confirmed: true });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});