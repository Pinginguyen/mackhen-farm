import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, orderUpdateMany, paymentFindFirst, paymentUpdate, paymentCreate, requireAdmin, prisma } = vi.hoisted(() => {
  const mocks = {
    orderFindUnique: vi.fn(), orderUpdateMany: vi.fn(), paymentFindFirst: vi.fn(),
    paymentUpdate: vi.fn(), paymentCreate: vi.fn(), requireAdmin: vi.fn(),
  };
  const transaction = {
    order: { updateMany: mocks.orderUpdateMany },
    payment: { findFirst: mocks.paymentFindFirst, update: mocks.paymentUpdate, create: mocks.paymentCreate },
  };
  return {
    ...mocks,
    prisma: {
      order: { findUnique: mocks.orderFindUnique },
      $transaction: vi.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));

import { POST } from './route';

function makeRequest(orderCode: unknown = 'MKF-123456') {
  return new Request('https://mackhen.example/api/admin/sepay/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderCode }),
  });
}

describe('POST /api/admin/sepay/simulate', () => {
  beforeEach(() => {
    vi.stubEnv('SEPAY_WEBHOOK_SECRET', 'test-sepay-secret');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://mackhen.example');
    requireAdmin.mockReset().mockResolvedValue(null);
    orderFindUnique.mockReset()
      .mockResolvedValueOnce({ id: 'order-1', numericCode: 123456, orderCode: 'MKF-123456', totalAmount: 169000, paymentMethod: 'VIETQR', paymentStatus: 'PENDING', orderStatus: 'PENDING' })
      .mockResolvedValueOnce({ paymentStatus: 'PAID', orderStatus: 'PAID' });
    orderUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    paymentFindFirst.mockReset().mockResolvedValue({ id: 'payment-1' });
    paymentUpdate.mockReset().mockResolvedValue({ id: 'payment-1' });
    paymentCreate.mockReset().mockResolvedValue({ id: 'payment-1' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requires an admin session', async () => {
    const denied = new Response(JSON.stringify({ error: 'Truy cập bị từ chối' }), { status: 403 });
    requireAdmin.mockResolvedValueOnce(denied);

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(orderFindUnique).not.toHaveBeenCalled();
  });

  it('sends the persisted total to the authenticated SePay webhook and confirms payment', async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, paymentStatus: 'PAID' });
    expect(fetch).toHaveBeenCalledWith(new URL('https://mackhen.example/api/payment/sepay/webhook'), expect.objectContaining({
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Apikey test-sepay-secret' },
      body: JSON.stringify({ gateway: 'MBBank', subAccount: '0762793244', content: 'MKF-123456', transferAmount: 169000 }),
    }));
    expect(orderFindUnique).toHaveBeenCalledTimes(2);
  });

  it('lets an authenticated non-production admin simulate payment without webhook secrets', async () => {
    vi.stubEnv('SEPAY_WEBHOOK_SECRET', '');

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, paymentStatus: 'PAID', simulated: true });
    expect(orderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'order-1', paymentMethod: 'VIETQR', paymentStatus: 'PENDING' }),
      data: expect.objectContaining({ paymentStatus: 'PAID', orderStatus: 'PAID', reconciled: false }),
    }));
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: 'payment-1' }, data: { status: 'PAID', amount: 169000 } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects orders that are not pending VietQR payments', async () => {
    orderFindUnique.mockReset().mockResolvedValueOnce({ orderCode: 'MKF-123456', totalAmount: 169000, paymentMethod: 'COD', paymentStatus: 'PENDING', orderStatus: 'PENDING' });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
});