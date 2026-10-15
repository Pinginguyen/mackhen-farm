import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique } = vi.hoisted(() => ({ orderFindUnique: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { order: { findUnique: orderFindUnique } } }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('https://mackhen.example/api/tracking', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tracking', () => {
  beforeEach(() => {
    orderFindUnique.mockReset().mockResolvedValue({
      orderCode: 'MKF-123456',
      customerName: 'Nguyen Van A',
      phone: '0762793244',
      address: 'Lai Chau, Tam Duong, Binh Lu, So 12 duong X',
      orderStatus: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'COD',
      subtotal: 169000,
      shippingFee: 0,
      discountAmount: 0,
      totalAmount: 169000,
      trackingCode: null,
      carrier: null,
      createdAt: new Date('2026-10-14T00:00:00Z'),
      deliveredAt: null,
      warrantyRequest: null,
      items: [],
    });
  });

  it('requires both an order code and a valid phone number', async () => {
    const response = await POST(makeRequest({ orderCode: 'MKF-123456' }));

    expect(response.status).toBe(400);
    expect(orderFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a non-object request body without querying orders', async () => {
    const response = await POST(makeRequest(null));

    expect(response.status).toBe(400);
    expect(orderFindUnique).not.toHaveBeenCalled();
  });

  it('returns invoice details only when both order code and phone match', async () => {
    const response = await POST(makeRequest({ orderCode: ' mkf-123456 ', phone: '0762 793 244' }));
    const result = await response.json() as { items: Array<{ maskedPhone: string; maskedAddress: string; phone: string; address: string; customerName: string; paymentMethod: string; subtotal: number }> };

    expect(response.status).toBe(200);
    expect(result.items[0]).toMatchObject({
      maskedPhone: '0762.xxx.244', maskedAddress: 'Binh Lu, Tam Duong, Lai Chau',
      phone: '0762793244', address: 'Lai Chau, Tam Duong, Binh Lu, So 12 duong X',
      customerName: 'Nguyen Van A', paymentMethod: 'COD', subtotal: 169000,
    });
  });

  it('does not return an order when the phone does not match', async () => {
    const response = await POST(makeRequest({ orderCode: 'MKF-123456', phone: '0901234567' }));
    const result = await response.json() as { items: unknown[] };

    expect(result.items).toHaveLength(0);
  });
});