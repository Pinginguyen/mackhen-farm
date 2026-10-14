import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const { productFindUnique, productUpdate, variantUpdateMany, requireAdmin } = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  variantUpdateMany: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (operation: (transaction: unknown) => Promise<unknown>) => operation({
      product: { findUnique: productFindUnique, update: productUpdate },
      productVariant: { updateMany: variantUpdateMany },
    }),
  },
}));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));

import { PATCH } from './route';

describe('PATCH /api/admin/inventory', () => {
  beforeEach(() => {
    productFindUnique.mockReset();
    productUpdate.mockReset();
    variantUpdateMany.mockReset();
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue(null);
    productFindUnique.mockResolvedValue({ stock: 12 });
    productUpdate.mockResolvedValue({ id: 'product-1', price: 79000, stock: 24 });
    variantUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('updates product and variant price and stock together', async () => {
    const request = new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', price: 79000, stock: 24 }),
    });
    const response = await PATCH(request);
    const body = await response.json() as { message: string; product: { price: number; stock: number } };

    expect(response.status).toBe(200);
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { price: 79000, stock: 24 } });
    expect(variantUpdateMany).toHaveBeenCalledWith({ where: { productId: 'product-1' }, data: { price: 79000, stock: 24 } });
    expect(body.message).toBe('Đã cập nhật giá và tồn kho thành công!');
  });

  it('applies quick stock deltas without allowing negative inventory', async () => {
    productFindUnique.mockResolvedValue({ stock: 1 });
    productUpdate.mockResolvedValue({ id: 'product-1', price: 79000, stock: 0, active: true });
    const request = new Request('https://mackhen.example/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'product-1', stockDelta: -2 }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 'product-1' }, data: { stock: 0 } });
    expect(variantUpdateMany).toHaveBeenCalledWith({ where: { productId: 'product-1' }, data: { stock: 0 } });
  });

  it('returns the ADMIN guard response without touching product data', async () => {
    requireAdmin.mockResolvedValue(NextResponse.json({ error: 'Truy cập bị từ chối' }, { status: 403 }));
    const request = new Request('https://mackhen.example/api/admin/inventory', { method: 'PATCH' });
    const response = await PATCH(request);

    expect(response.status).toBe(403);
    expect(productUpdate).not.toHaveBeenCalled();
  });
});