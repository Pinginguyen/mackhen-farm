import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, reviewCreate, reviewAggregate, productUpdate } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  reviewCreate: vi.fn(),
  reviewAggregate: vi.fn(),
  productUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: orderFindUnique },
    review: { create: reviewCreate, aggregate: reviewAggregate },
    product: { update: productUpdate },
  },
}));

import { POST } from './route';

describe('POST /api/reviews', () => {
  beforeEach(() => {
    orderFindUnique.mockReset().mockResolvedValue({
      customerName: 'Buyer', phone: '0762793244', orderStatus: 'COMPLETED', items: [{ productId: 'product-1' }],
    });
    reviewCreate.mockReset().mockResolvedValue({ id: 'review-1' });
    reviewAggregate.mockReset().mockResolvedValue({ _avg: { rating: 5 } });
    productUpdate.mockReset().mockResolvedValue({ id: 'product-1' });
  });

  it.each(['DELIVERED', 'COMPLETED'])('accepts a review for a %s order with a normalized matching phone and product', async (orderStatus) => {
    orderFindUnique.mockResolvedValueOnce({
      customerName: 'Buyer', phone: '0762793244', orderStatus, items: [{ productId: 'product-1' }],
    });
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '+84 762 793 244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(201);
    expect(orderFindUnique).toHaveBeenCalledWith({
      where: { orderCode: 'MKF-123456' },
      select: { customerName: true, phone: true, orderStatus: true, items: { select: { productId: true } } },
    });
    expect(reviewCreate).toHaveBeenCalled();
  });

  it('returns a specific error when the phone does not match', async () => {
    orderFindUnique.mockResolvedValueOnce({ customerName: 'Buyer', phone: '0912345678', orderStatus: 'COMPLETED', items: [{ productId: 'product-1' }] });
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '0762793244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('PHONE_MISMATCH');
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('returns a specific error when the order is not complete', async () => {
    orderFindUnique.mockResolvedValueOnce({ customerName: 'Buyer', phone: '0762793244', orderStatus: 'PENDING', items: [{ productId: 'product-1' }] });
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '0762793244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('ORDER_NOT_COMPLETED');
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('returns a specific error when the product is not in the order', async () => {
    orderFindUnique.mockResolvedValueOnce({ customerName: 'Buyer', phone: '0762793244', orderStatus: 'DELIVERED', items: [{ productId: 'other-product' }] });
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '0762793244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('PRODUCT_NOT_IN_ORDER');
    expect(reviewCreate).not.toHaveBeenCalled();
  });
});