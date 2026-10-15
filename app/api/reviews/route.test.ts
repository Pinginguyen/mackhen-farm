import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderFindUnique, reviewFindUnique, reviewCreate, reviewAggregate, productUpdate } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  reviewFindUnique: vi.fn(),
  reviewCreate: vi.fn(),
  reviewAggregate: vi.fn(),
  productUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: orderFindUnique },
    review: { findUnique: reviewFindUnique, create: reviewCreate, aggregate: reviewAggregate },
    product: { update: productUpdate },
  },
}));

import { POST } from './route';

describe('POST /api/reviews', () => {
  beforeEach(() => {
    orderFindUnique.mockReset().mockResolvedValue({
      id: 'order-1', customerName: 'Buyer', phone: '0762793244', orderStatus: 'COMPLETED', items: [{ productId: 'product-1' }],
    });
    reviewFindUnique.mockReset().mockResolvedValue(null);
    reviewCreate.mockReset().mockResolvedValue({ id: 'review-1' });
    reviewAggregate.mockReset().mockResolvedValue({ _avg: { rating: 5 } });
    productUpdate.mockReset().mockResolvedValue({ id: 'product-1' });
  });

  it.each(['DELIVERED', 'COMPLETED'])('accepts a review for a %s order with a normalized matching phone and product', async (orderStatus) => {
    orderFindUnique.mockResolvedValueOnce({
      id: 'order-1', customerName: 'Buyer', phone: '0762793244', orderStatus, items: [{ productId: 'product-1' }],
    });
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '+84 762 793 244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(201);
    expect(orderFindUnique).toHaveBeenCalledWith({
      where: { orderCode: 'MKF-123456' },
      select: { id: true, customerName: true, phone: true, orderStatus: true, items: { select: { productId: true } } },
    });
    expect(reviewCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 'order-1', productId: 'product-1' }) });
  });

  it('returns a specific error when the phone does not match', async () => {
    orderFindUnique.mockResolvedValueOnce({ id: 'order-1', customerName: 'Buyer', phone: '0912345678', orderStatus: 'COMPLETED', items: [{ productId: 'product-1' }] });
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
    orderFindUnique.mockResolvedValueOnce({ id: 'order-1', customerName: 'Buyer', phone: '0762793244', orderStatus: 'PENDING', items: [{ productId: 'product-1' }] });
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
    orderFindUnique.mockResolvedValueOnce({ id: 'order-1', customerName: 'Buyer', phone: '0762793244', orderStatus: 'DELIVERED', items: [{ productId: 'other-product' }] });
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '0762793244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('PRODUCT_NOT_IN_ORDER');
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('rejects a second review for the same order and product', async () => {
    reviewFindUnique.mockResolvedValueOnce({ id: 'review-existing' });
    const response = await POST(new Request('https://mackhen.example/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', orderCode: 'MKF-123456', phone: '0762793244', rating: 5, comment: 'Sản phẩm tốt' }),
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.message).toBe('Bạn đã đánh giá sản phẩm này trong đơn hàng trước đó.');
    expect(reviewCreate).not.toHaveBeenCalled();
  });
});