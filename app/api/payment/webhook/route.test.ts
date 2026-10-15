import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindFirst, orderUpdate, paymentFindFirst, paymentUpdate, paymentCreate, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    orderFindFirst: vi.fn(),
    orderUpdate: vi.fn(),
    paymentFindFirst: vi.fn(),
    paymentUpdate: vi.fn(),
    paymentCreate: vi.fn(),
  };
  const tx = {
    order: { update: mocks.orderUpdate },
    payment: { findFirst: mocks.paymentFindFirst, update: mocks.paymentUpdate, create: mocks.paymentCreate },
  };
  const transactionCall = vi.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  return {
    ...mocks,
    transaction: tx,
    prisma: { order: { findFirst: mocks.orderFindFirst }, $transaction: transactionCall },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

const secret = 'MACKHEN_FARM_SECRET_KEY_2026';

function makeRequest(body: unknown, webhookSecret = secret) {
  return new Request('https://mackhen.example/api/payment/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': webhookSecret },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payment/webhook', () => {
  beforeEach(() => {
    vi.stubEnv('PAYMENT_WEBHOOK_SECRET', secret);
    orderFindFirst.mockReset().mockResolvedValue({
      id: 'order-1', orderCode: 'MKF-123456', numericCode: 123456, paymentMethod: 'VIETQR',
      totalAmount: 65000, paymentStatus: 'PENDING', orderStatus: 'PENDING', note: null,
    });
    orderUpdate.mockReset().mockResolvedValue({ id: 'order-1' });
    paymentFindFirst.mockReset().mockResolvedValue({ id: 'payment-1', status: 'PENDING' });
    paymentUpdate.mockReset().mockResolvedValue({ id: 'payment-1', status: 'PAID' });
    paymentCreate.mockReset().mockResolvedValue({ id: 'payment-1', status: 'PAID' });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('rejects requests without the webhook secret', async () => {
    const response = await POST(makeRequest({ orderCode: 'MKF-123456', amount: 65000 }, 'wrong-secret'));
    expect(response.status).toBe(401);
    expect(orderFindFirst).not.toHaveBeenCalled();
  });

  it('rejects an amount that does not match the order', async () => {
    const response = await POST(makeRequest({ orderCode: 'MKF-123456', amount: 64000 }));
    expect(response.status).toBe(409);
    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('marks a VietQR order and its payment paid idempotently', async () => {
    const response = await POST(makeRequest({ orderCode: 'MKF-123456', amount: '65000', sender: 'NGUYEN A', transactionTime: '2026-10-15T10:00:00+07:00' }));
    const result = await response.json() as { success: boolean; message: string };

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ success: true, message: 'Đã xác nhận thanh toán thành công cho đơn MKF-123456' });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: expect.objectContaining({ paymentStatus: 'PAID', orderStatus: 'PAID', note: expect.stringContaining('Thanh toán tự động qua MB Bank Email IPN') }),
    });
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: 'payment-1' }, data: { status: 'PAID', amount: 65000 } });
  });

  it('records a late payment without reopening a cancelled order', async () => {
    orderFindFirst.mockResolvedValueOnce({
      id: 'order-1', orderCode: 'MKF-123456', numericCode: 123456, paymentMethod: 'VIETQR',
      totalAmount: 65000, paymentStatus: 'PENDING', orderStatus: 'CANCELLED', note: null,
    });
    const response = await POST(makeRequest({ orderCode: 'MKF-123456', amount: 65000 }));
    const result = await response.json() as { requiresRefundReview: boolean };

    expect(response.status).toBe(200);
    expect(result.requiresRefundReview).toBe(true);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paymentStatus: 'PAID', orderStatus: 'CANCELLED', reconciled: false, holdExpiresAt: null }),
    }));
  });

  it('resolves a numeric order number to its MKF order code', async () => {
    const response = await POST(makeRequest({ orderCode: '123456', amount: 65000 }));

    expect(response.status).toBe(200);
    expect(orderFindFirst).toHaveBeenCalledWith({ where: { OR: [{ orderCode: 'MKF-123456' }, { numericCode: 123456 }] } });
  });

  it('records a temporary paid status and acknowledges when the database is unavailable', async () => {
    const databaseError = new Error('database offline');
    databaseError.name = 'PrismaClientInitializationError';
    orderFindFirst.mockRejectedValueOnce(databaseError);

    const response = await POST(makeRequest({ orderCode: 'MKF-654321', amount: 45000 }));
    const result = await response.json() as { success: boolean; temporary: boolean };
    expect(response.status).toBe(200);
    expect(result).toMatchObject({ success: true, temporary: true });
  });
});