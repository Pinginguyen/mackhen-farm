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

function sessionEvents(eventType: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    eventType,
    sessionId: `${eventType}-${index}`,
    _count: { _all: index ? 1 : 3 },
  }));
}

describe('GET /api/admin/reports/funnel', () => {
  beforeEach(() => {
    funnelEventGroupBy.mockReset().mockResolvedValue([
      ...sessionEvents('PRODUCT_VIEW', 1000),
      ...sessionEvents('ADD_TO_CART', 120),
      ...sessionEvents('CHECKOUT_START', 50),
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
      by: ['eventType', 'sessionId'],
      where: { createdAt: { gte: expect.any(Date) } },
      _count: { _all: true },
    }));
    expect(orderCount).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ paymentStatus: 'PAID', orderStatus: { not: 'CANCELLED' } }),
    }));
  });

  it('returns zero event counts instead of estimated traffic when no events have been recorded', async () => {
    funnelEventGroupBy.mockResolvedValueOnce([]);
    orderCount.mockResolvedValueOnce(4);

    const response = await GET(new Request('https://mackhen.example/api/admin/reports/funnel'));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      views: 0,
      cartAdds: 0,
      checkouts: 0,
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
    expect(result).toMatchObject({ views: 0, cartAdds: 0, checkouts: 0, completed: 10, usingFallback: true, eventDataUnavailable: true });
  });

  it('returns the admin guard response without querying funnel data', async () => {
    requireAdmin.mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));
    const response = await GET(new Request('https://mackhen.example/api/admin/reports/funnel'));

    expect(response.status).toBe(403);
    expect(funnelEventGroupBy).not.toHaveBeenCalled();
    expect(orderCount).not.toHaveBeenCalled();
  });
});