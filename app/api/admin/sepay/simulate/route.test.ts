import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, requireAdmin, prisma } = vi.hoisted(() => {
  const mocks = { orderFindUnique: vi.fn(), requireAdmin: vi.fn() };
  return { ...mocks, prisma: { order: { findUnique: mocks.orderFindUnique } } };
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
      .mockResolvedValueOnce({ orderCode: 'MKF-123456', totalAmount: 169000, paymentMethod: 'VIETQR', paymentStatus: 'PENDING', orderStatus: 'PENDING' })
      .mockResolvedValueOnce({ paymentStatus: 'PAID', orderStatus: 'PAID' });
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

  it('rejects orders that are not pending VietQR payments', async () => {
    orderFindUnique.mockReset().mockResolvedValueOnce({ orderCode: 'MKF-123456', totalAmount: 169000, paymentMethod: 'COD', paymentStatus: 'PENDING', orderStatus: 'PENDING' });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
});