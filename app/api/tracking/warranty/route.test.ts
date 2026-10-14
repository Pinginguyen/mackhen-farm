import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, warrantyCreate, warrantyFindUnique } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  warrantyCreate: vi.fn(),
  warrantyFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { order: { findUnique: orderFindUnique }, warrantyRequest: { create: warrantyCreate, findUnique: warrantyFindUnique } } }));

import { POST } from './route';

const recentDeliveredOrder = () => ({
  id: 'order-1',
  phone: '0762 793 244',
  orderStatus: 'DELIVERED',
  deliveredAt: new Date(Date.now() - 60 * 60 * 1000),
  updatedAt: new Date(),
  warrantyRequest: null,
});

function makeRequest(phone = '0762-793-244') {
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
});