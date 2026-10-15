import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, orderUpdate, paymentFindFirst, paymentUpdate, paymentCreate, prisma } = vi.hoisted(() => {
  const mocks = {
    orderFindUnique: vi.fn(),
    orderUpdate: vi.fn(),
    paymentFindFirst: vi.fn(),
    paymentUpdate: vi.fn(),
    paymentCreate: vi.fn(),
  };
  const transactionClient = {
    order: { update: mocks.orderUpdate },
    payment: { findFirst: mocks.paymentFindFirst, update: mocks.paymentUpdate, create: mocks.paymentCreate },
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

import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('https://mackhen.example/api/payment/sepay/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payment/sepay/webhook', () => {
  beforeEach(() => {
    orderFindUnique.mockReset().mockResolvedValue({
      id: 'order-1', numericCode: 123456, totalAmount: 65000,
      paymentMethod: 'VIETQR', paymentStatus: 'PENDING', orderStatus: 'PENDING',
    });
    orderUpdate.mockReset().mockResolvedValue({ id: 'order-1' });
    paymentFindFirst.mockReset().mockResolvedValue({ id: 'payment-1' });
    paymentUpdate.mockReset().mockResolvedValue({ id: 'payment-1' });
    paymentCreate.mockReset().mockResolvedValue({ id: 'payment-1' });
  });

  it('marks a matching order paid and stores the SePay reference code', async () => {
    const response = await POST(makeRequest({
      content: 'Thanh toan don MKF123456',
      transferAmount: 70000,
      referenceCode: 'SP-9988',
      gateway: 'MBBank',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(orderFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { orderCode: 'MKF-123456' } }));
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { paymentStatus: 'PAID', orderStatus: 'PAID', holdExpiresAt: null },
    });
    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'PAID', amount: 70000, externalId: 'SP-9988' },
    });
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
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it('acknowledges malformed JSON with HTTP 200', async () => {
    const response = await POST(new Request('https://mackhen.example/api/payment/sepay/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });
});