import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindFirst, reviewCreate, reviewAggregate, productUpdate } = vi.hoisted(() => ({
  orderFindFirst: vi.fn(),
  reviewCreate: vi.fn(),
  reviewAggregate: vi.fn(),
  productUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findFirst: orderFindFirst },
    review: { create: reviewCreate, aggregate: reviewAggregate },
    product: { update: productUpdate },
  },
}));

import { POST } from './route';

describe('POST /api/reviews', () => {
  beforeEach(() => {
    orderFindFirst.mockReset().mockResolvedValue({ customerName: 'Buyer' });
    reviewCreate.mockReset().mockResolvedValue({ id: 'review-1' });
    reviewAggregate.mockReset().mockResolvedValue({ _avg: { rating: 5 } });
    productUpdate.mockReset().mockResolvedValue({ id: 'product-1' });
  });

  it.each(['DELIVERED', 'COMPLETED'])('accepts a review for a %s order with the matching phone and product', async () => {
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '0762793244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(201);
    expect(orderFindFirst).toHaveBeenCalledWith({
      where: {
        orderCode: 'MKF-123456',
        phone: '0762793244',
        orderStatus: { in: ['DELIVERED', 'COMPLETED'] },
        items: { some: { productId: 'product-1' } },
      },
      select: { customerName: true },
    });
    expect(reviewCreate).toHaveBeenCalled();
  });

  it('rejects a review when the order code and exact phone do not match', async () => {
    orderFindFirst.mockResolvedValueOnce(null);
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '0762793244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(403);
    expect(reviewCreate).not.toHaveBeenCalled();
  });
});