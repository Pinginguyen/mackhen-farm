import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, orderUpdate, paymentFindFirst, paymentUpdate, paymentCreate, transferCreateMany, prisma } = vi.hoisted(() => {
  const mocks = {
    orderFindUnique: vi.fn(),
    orderUpdate: vi.fn(),
    paymentFindFirst: vi.fn(),
    paymentUpdate: vi.fn(),
    paymentCreate: vi.fn(),
    transferCreateMany: vi.fn(),
  };
  const transactionClient = {
    order: { update: mocks.orderUpdate },
    payment: { findFirst: mocks.paymentFindFirst, update: mocks.paymentUpdate, create: mocks.paymentCreate },
    bankTransfer: { createMany: mocks.transferCreateMany },
  };
  return {
    ...mocks,
    prisma: {
      order: { findUnique: mocks.orderFindUnique },
      $transaction: vi.fn((callback: (client: typeof transactionClient) => Promise<unknown>) => callback(transactionClient)),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/order-email-notifications', () => ({ sendOrderConfirmationIfNeeded: vi.fn().mockResolvedValue(false) }));

import { POST } from './route';

const secret = 'sepay-test-secret';

function makeRequest(body: unknown, authorization: string | null = `Apikey ${secret}`) {
  return new Request('https://mackhen.example/api/payment/sepay/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payment/sepay/webhook', () => {
  beforeEach(() => {
    vi.stubEnv('SEPAY_WEBHOOK_SECRET', secret);
    orderFindUnique.mockReset().mockResolvedValue({
      id: 'order-1', numericCode: 123456, totalAmount: 65000,
      paymentMethod: 'VIETQR', paymentStatus: 'PENDING', orderStatus: 'PENDING',
    });
    orderUpdate.mockReset().mockResolvedValue({ id: 'order-1' });
    paymentFindFirst.mockReset().mockResolvedValue({ id: 'payment-1' });
    paymentUpdate.mockReset().mockResolvedValue({ id: 'payment-1' });
    paymentCreate.mockReset().mockResolvedValue({ id: 'payment-1' });
    transferCreateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('rejects requests without an authorization header', async () => {
    const response = await POST(makeRequest({ content: 'MKF-123456', transferAmount: 65000 }, null));

    expect(response.status).toBe(401);
    expect(orderFindUnique).not.toHaveBeenCalled();
  });

  it('fails closed when the webhook secret is not configured', async () => {
    vi.stubEnv('SEPAY_WEBHOOK_SECRET', '');
    const response = await POST(makeRequest({ content: 'MKF-123456', transferAmount: 65000 }));

    expect(response.status).toBe(401);
    expect(orderFindUnique).not.toHaveBeenCalled();
  });

  it('rejects an invalid authorization key', async () => {
    const response = await POST(makeRequest({ content: 'MKF-123456', transferAmount: 65000 }, 'ApiKey wrong-secret'));

    expect(response.status).toBe(401);
    expect(orderFindUnique).not.toHaveBeenCalled();
  });

  it('marks a matching order paid and stores the SePay reference code', async () => {
    const response = await POST(makeRequest({
      content: 'Thanh toan don MKF123456',
      transferAmount: 65000,
      referenceCode: 'SP-9988',
      gateway: 'MBBank',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(orderFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { orderCode: 'MKF-123456' } }));
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: expect.objectContaining({ paymentStatus: 'PAID', orderStatus: 'PAID', holdExpiresAt: null, sepayTransactionId: 'SP-9988', reconciled: true, reconciliationStatus: 'MATCHED' }),
    });
    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'PAID', amount: 65000, externalId: 'SP-9988' },
    });
  });

  it('acknowledges a duplicate SePay transaction when the unique constraint rejects it', async () => {
    orderUpdate.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));

    const response = await POST(makeRequest({
      content: 'MKF-123456', transferAmount: 65000, id: 9988, referenceCode: 'SP-9988',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(paymentFindFirst).not.toHaveBeenCalled();
  });

  it('accepts MoMo orders paid through the linked MB Bank QR', async () => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'order-1', numericCode: 123456, totalAmount: 65000,
      paymentMethod: 'MOMO', paymentStatus: 'PENDING', orderStatus: 'PENDING',
    });
    const response = await POST(makeRequest({ content: 'MKF-123456', transferAmount: 65000 }));

    expect(response.status).toBe(200);
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paymentStatus: 'PAID' }),
    }));
  });

  it('extracts a hyphenated order code from description and creates a payment if needed', async () => {
    paymentFindFirst.mockResolvedValueOnce(null);
    const response = await POST(makeRequest({ description: 'MKF-123456', transferAmount: '65000' }));

    expect(response.status).toBe(200);
    expect(paymentCreate).toHaveBeenCalledWith({
      data: { orderId: 'order-1', orderCode: 123456, status: 'PAID', amount: 65000 },
    });
  });

  it('does not mark an underpaid order paid and still acknowledges the webhook', async () => {
    const response = await POST(makeRequest({ content: 'MKF-123456', transferAmount: 64999 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reconciliationStatus: 'MISMATCH', reconciled: false }) }));
    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(transferCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ status: 'MISMATCH', amount: 64999, orderId: 'order-1' })] }));
  });

  it('records transfers with unknown order content for manual matching', async () => {
    orderFindUnique.mockResolvedValueOnce(null);
    const response = await POST(makeRequest({ content: 'khach chuyen khoan', transferAmount: 65000, id: 9989 }));

    expect(response.status).toBe(200);
    expect(transferCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ status: 'UNMATCHED', orderId: null, orderCode: null, amount: 65000 })] }));
  });

  it('acknowledges malformed JSON with HTTP 200', async () => {
    const response = await POST(new Request('https://mackhen.example/api/payment/sepay/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Apikey ${secret}` },
      body: '{',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });
});