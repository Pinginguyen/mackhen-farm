import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reviewFindMany, requireAdmin, prisma } = vi.hoisted(() => {
  const reviewFindMany = vi.fn();
  const requireAdmin = vi.fn();
  return { reviewFindMany, requireAdmin, prisma: { review: { findMany: reviewFindMany } } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET } from './route';

describe('GET /api/admin/reviews', () => {
  beforeEach(() => {
    reviewFindMany.mockReset().mockResolvedValue([]);
    requireAdmin.mockReset().mockResolvedValue(null);
  });

  it('requires admin access', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const response = await GET(new Request('https://mackhen.example/api/admin/reviews'));
    expect(response.status).toBe(403);
    expect(reviewFindMany).not.toHaveBeenCalled();
  });

  it('filters five-star reviews and selects customer phone/product data', async () => {
    const response = await GET(new Request('https://mackhen.example/api/admin/reviews?rating=5'));

    expect(response.status).toBe(200);
    expect(reviewFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { rating: 5 },
      take: 100,
      select: expect.objectContaining({
        order: { select: { orderCode: true, phone: true } },
        product: { select: { id: true, slug: true, name: true } },
      }),
    }));
  });

  it('filters one- and two-star reviews needing attention', async () => {
    await GET(new Request('https://mackhen.example/api/admin/reviews?rating=low'));
    expect(reviewFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { rating: { lte: 2 } } }));
  });
});
