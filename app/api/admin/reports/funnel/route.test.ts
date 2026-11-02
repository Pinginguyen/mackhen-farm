import { beforeEach, describe, expect, it, vi } from 'vitest';

const { funnelEventGroupBy, orderCount, requireAdmin } = vi.hoisted(() => ({
  funnelEventGroupBy: vi.fn(),
  orderCount: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { funnelEvent: { groupBy: funnelEventGroupBy }, order: { count: orderCount } } }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET } from './route';

describe('GET /api/admin/reports/funnel', () => {
  beforeEach(() => {
    funnelEventGroupBy.mockReset().mockResolvedValue([
      { eventType: 'PRODUCT_VIEW', _count: { _all: 1000 } },
      { eventType: 'ADD_TO_CART', _count: { _all: 120 } },
      { eventType: 'CHECKOUT_START', _count: { _all: 50 } },
    ]);
    orderCount.mockReset().mockResolvedValue(20);
    requireAdmin.mockReset().mockResolvedValue(null);
  });

  it('returns real 30-day funnel metrics and calculated conversion rates', async () => {
    const response = await GET(new Request('https://mackhen.example/api/admin/reports/funnel'));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      periodDays: 30,
      views: 1000,
      cartAdds: 120,
      checkouts: 50,
      completed: 20,
      cartRate: 12,
      cartToCheckoutRate: 41.67,
      checkoutRate: 40,
      overallRate: 2,
      checkoutDropOffRate: 60,
      usingFallback: false,
    });
    expect(funnelEventGroupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ['eventType'],
      where: { createdAt: { gte: expect.any(Date) } },
      _count: { _all: true },
    }));
    expect(orderCount).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ paymentStatus: 'PAID', orderStatus: { not: 'CANCELLED' } }),
    }));
  });

  it('returns estimated funnel counts when no traffic events have been recorded', async () => {
    funnelEventGroupBy.mockResolvedValueOnce([]);
    orderCount.mockResolvedValueOnce(4);

    const response = await GET(new Request('https://mackhen.example/api/admin/reports/funnel'));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      views: 120,
      cartAdds: 35,
      checkouts: 12,
      completed: 4,
      usingFallback: true,
    });
  });

  it('keeps the report available when the funnel-events table is not migrated yet', async () => {
    funnelEventGroupBy.mockRejectedValueOnce(new Error('FunnelEvent table does not exist'));
    orderCount.mockResolvedValueOnce(10);

    const response = await GET(new Request('https://mackhen.example/api/admin/reports/funnel'));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ views: 250, cartAdds: 60, checkouts: 20, completed: 10, usingFallback: true });
  });

  it('returns the admin guard response without querying funnel data', async () => {
    requireAdmin.mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));
    const response = await GET(new Request('https://mackhen.example/api/admin/reports/funnel'));

    expect(response.status).toBe(403);
    expect(funnelEventGroupBy).not.toHaveBeenCalled();
    expect(orderCount).not.toHaveBeenCalled();
  });
});