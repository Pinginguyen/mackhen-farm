import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, warrantyCreate, warrantyFindUnique, getRequestSession } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  warrantyCreate: vi.fn(),
  warrantyFindUnique: vi.fn(),
  getRequestSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { order: { findUnique: orderFindUnique }, warrantyRequest: { create: warrantyCreate, findUnique: warrantyFindUnique } } }));
vi.mock('@/lib/auth', () => ({ getRequestSession }));

import { POST } from './route';

const recentDeliveredOrder = () => ({
  id: 'order-1',
  userId: null,
  phone: '0762 793 244',
  orderStatus: 'DELIVERED',
  deliveredAt: new Date(Date.now() - 60 * 60 * 1000),
  updatedAt: new Date(),
  warrantyRequest: null,
});

function makeRequest(phone: string | undefined = '0762-793-244') {
  return new Request('https://mackhen.example/api/tracking/warranty', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderCode: 'mkf-123456', phone, reason: 'Hở túi' }),
  });
}

describe('POST /api/tracking/warranty', () => {
  beforeEach(() => {
    orderFindUnique.mockReset().mockResolvedValue(recentDeliveredOrder());
    warrantyCreate.mockReset().mockResolvedValue({ id: 'warranty-1', reason: 'Hở túi', status: 'OPEN' });
    warrantyFindUnique.mockReset();
    getRequestSession.mockReset().mockReturnValue(null);
  });

  it('records one warranty request for the matching delivered order within 24 hours', async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
    expect(warrantyCreate).toHaveBeenCalledWith({ data: { orderId: 'order-1', reason: 'Hở túi' } });
  });

  it('rejects requests after the 24-hour window', async () => {
    orderFindUnique.mockResolvedValue({ ...recentDeliveredOrder(), deliveredAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });
    const response = await POST(makeRequest());

    expect(response.status).toBe(410);
    expect(warrantyCreate).not.toHaveBeenCalled();
  });

  it('does not reveal an order when the submitted phone does not match', async () => {
    const response = await POST(makeRequest('0900000000'));

    expect(response.status).toBe(404);
    expect(warrantyCreate).not.toHaveBeenCalled();
  });

  it('normalizes an international phone number from the request', async () => {
    const response = await POST(makeRequest('+84 762 793 244'));

    expect(response.status).toBe(201);
  });

  it('normalizes an international phone number stored on the order', async () => {
    orderFindUnique.mockResolvedValue({ ...recentDeliveredOrder(), phone: '+84 762 793 244' });
    const response = await POST(makeRequest('0762-793-244'));

    expect(response.status).toBe(201);
  });

  it('allows the signed-in owner to request warranty without resubmitting a phone number', async () => {
    orderFindUnique.mockResolvedValue({ ...recentDeliveredOrder(), userId: 'user-1' });
    getRequestSession.mockReturnValue({ userId: 'user-1' });
    const response = await POST(makeRequest(undefined));

    expect(response.status).toBe(201);
  });
});