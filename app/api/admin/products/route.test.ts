import { beforeEach, describe, expect, it, vi } from 'vitest';

const { productFindMany, requireAdmin, prisma } = vi.hoisted(() => {
  const productFindMany = vi.fn();
  const requireAdmin = vi.fn();
  return { productFindMany, requireAdmin, prisma: { product: { findMany: productFindMany } } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET } from './route';

describe('GET /api/admin/products', () => {
  beforeEach(() => {
    productFindMany.mockReset().mockResolvedValue([]);
    requireAdmin.mockReset().mockResolvedValue(null);
  });

  it('requires admin authorization', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const response = await GET(new Request('https://mackhen.example/api/admin/products'));

    expect(response.status).toBe(403);
    expect(productFindMany).not.toHaveBeenCalled();
  });

  it('returns persisted products including price, inventory, and active status', async () => {
    productFindMany.mockResolvedValueOnce([{
      id: 'db-product-1', name: 'Khô bò Mắc Khén', price: 99000, stock: 18, active: true,
      category: 'Khô chay Tây Bắc', badge: 'Bán chạy', nutritionFacts: null, variants: [],
    }]);
    const response = await GET(new Request('https://mackhen.example/api/admin/products'));
    const result = await response.json() as { items: { id: string; price: number; stock: number; active: boolean; badge: string }[] };

    expect(response.status).toBe(200);
    expect(result.items).toEqual([expect.objectContaining({ id: 'db-product-1', price: 99000, stock: 18, active: true, badge: 'Bán chạy' })]);
    expect(productFindMany).toHaveBeenCalledWith({ include: { variants: true }, orderBy: { createdAt: 'desc' } });
  });
});