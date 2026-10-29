import { beforeEach, describe, expect, it, vi } from 'vitest';

const { productFindMany, requireAdmin, createProduct, updateProduct, deleteProduct, prisma } = vi.hoisted(() => {
  const productFindMany = vi.fn();
  const requireAdmin = vi.fn();
  const createProduct = vi.fn();
  const updateProduct = vi.fn();
  const deleteProduct = vi.fn();
  return { productFindMany, requireAdmin, createProduct, updateProduct, deleteProduct, prisma: { product: { findMany: productFindMany } } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));
vi.mock('@/app/api/products/route', () => ({ POST: createProduct, PATCH: updateProduct, DELETE: deleteProduct }));

import { DELETE, GET, PATCH, POST } from './route';

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

  it('returns an empty list when the database has no catalog rows', async () => {
    const response = await GET(new Request('https://mackhen.example/api/admin/products'));
    const result = await response.json() as { items: { id: string }[] };

    expect(response.status).toBe(200);
    expect(result.items).toEqual([]);
  });

  it('does not replace a failed database query with sample products', async () => {
    const databaseError = new Error('The column Product.ingredients does not exist');
    databaseError.name = 'PrismaClientKnownRequestError';
    productFindMany.mockRejectedValueOnce(databaseError);

    await expect(GET(new Request('https://mackhen.example/api/admin/products'))).rejects.toThrow(databaseError);
  });

  it('delegates collection create, update, and delete to the guarded product handlers', async () => {
    const createResponse = Response.json({ product: { id: 'new-product' } }, { status: 201 });
    const updateResponse = Response.json({ product: { id: 'product-1' } });
    const deleteResponse = Response.json({ success: true });
    createProduct.mockResolvedValueOnce(createResponse);
    updateProduct.mockResolvedValueOnce(updateResponse);
    deleteProduct.mockResolvedValueOnce(deleteResponse);

    const createRequest = new Request('https://mackhen.example/api/admin/products', { method: 'POST', body: '{}' });
    const updateRequest = new Request('https://mackhen.example/api/admin/products', { method: 'PATCH', body: '{}' });
    const deleteRequest = new Request('https://mackhen.example/api/admin/products?id=product-1', { method: 'DELETE' });

    expect(await POST(createRequest)).toBe(createResponse);
    expect(await PATCH(updateRequest)).toBe(updateResponse);
    expect(await DELETE(deleteRequest)).toBe(deleteResponse);
    expect(createProduct).toHaveBeenCalledWith(createRequest);
    expect(updateProduct).toHaveBeenCalledWith(updateRequest);
    expect(deleteProduct).toHaveBeenCalledWith(deleteRequest);
  });
});