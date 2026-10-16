import { describe, expect, it, vi } from 'vitest';

const { orderFindUnique, prisma } = vi.hoisted(() => {
  const orderFindUnique = vi.fn();
  return { orderFindUnique, prisma: { order: { findUnique: orderFindUnique } } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

describe('POST /api/orders/[orderId]', () => {
  it('requires the matching order phone and returns payment status without customer data', async () => {
    orderFindUnique.mockReset().mockResolvedValue({ orderCode: 'MKF-123456', phone: '0762793244', paymentStatus: 'PAID', orderStatus: 'PAID' });
    const response = await POST(new Request('https://mackhen.example/api/orders/MKF-123456', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '0762793244' }) }), { params: { orderId: 'MKF-123456' } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ orderCode: 'MKF-123456', status: 'PAID', paymentStatus: 'PAID' });
  });

  it('rejects a non-matching phone number', async () => {
    orderFindUnique.mockReset().mockResolvedValue({ orderCode: 'MKF-654321', phone: '0762793244', paymentStatus: 'PENDING', orderStatus: 'PENDING' });
    const response = await POST(new Request('https://mackhen.example/api/orders/MKF-654321', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '0351234567' }) }), { params: { orderId: 'MKF-654321' } });
    expect(response.status).toBe(404);
  });

  it('requires a valid phone before looking up an order', async () => {
    orderFindUnique.mockReset();
    const response = await POST(new Request('https://mackhen.example/api/orders/MKF-654321', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }), { params: { orderId: 'MKF-654321' } });
    expect(response.status).toBe(400);
    expect(orderFindUnique).not.toHaveBeenCalled();
  });

  it('accepts the scoped HttpOnly verification cookie without exposing phone to the client component', async () => {
    orderFindUnique.mockReset().mockResolvedValue({ orderCode: 'MKF-123456', phone: '0762793244', paymentStatus: 'PENDING', orderStatus: 'PENDING' });
    const response = await POST(new Request('https://mackhen.example/api/orders/MKF-123456', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'mkf_payment_MKF-123456=0762793244' },
      body: '{}',
    }), { params: { orderId: 'MKF-123456' } });

    expect(response.status).toBe(200);
  });

  it('does not disclose cached status when the database is offline and phone ownership cannot be checked', async () => {
    const databaseError = new Error('database offline');
    databaseError.name = 'PrismaClientInitializationError';
    orderFindUnique.mockRejectedValueOnce(databaseError);

    const response = await POST(new Request('https://mackhen.example/api/orders/MKF-654321', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '0762793244' }) }), { params: { orderId: 'MKF-654321' } });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { message: expect.not.stringContaining('database offline') } });
  });
});