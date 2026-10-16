import { beforeEach, describe, expect, it, vi } from 'vitest';

const { orderAggregate, orderGroupBy, orderFindMany, refundAggregate, productFindMany, requireAdmin, unstableCache, prisma } = vi.hoisted(() => {
  const orderAggregate = vi.fn();
  const orderGroupBy = vi.fn();
  const orderFindMany = vi.fn();
  const refundAggregate = vi.fn();
  const productFindMany = vi.fn();
  const requireAdmin = vi.fn();
  const unstableCache = vi.fn();
  return {
    orderAggregate,
    orderGroupBy,
    orderFindMany,
    refundAggregate,
    productFindMany,
    requireAdmin,
    unstableCache,
    prisma: {
      order: { aggregate: orderAggregate, groupBy: orderGroupBy, findMany: orderFindMany },
      refundOperation: { aggregate: refundAggregate },
      product: { findMany: productFindMany },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));
vi.mock('next/cache', () => ({
  unstable_cache: (query: () => Promise<unknown>, keyParts: string[], options: { revalidate: number }) => {
    unstableCache(keyParts, options);
    return query;
  },
}));

import { GET } from './route';

function request() {
  return new Request('https://mackhen.example/api/admin/reports/overview');
}

describe('GET /api/admin/reports/overview', () => {
  beforeEach(() => {
    orderAggregate.mockReset().mockImplementation((args) => {
      if (args.where.orderStatus === 'CANCELLED') return Promise.resolve({ _sum: { netAmount: 20000 } });
      if (args.where.createdAt?.lt) return Promise.resolve({ _sum: { totalAmount: 200000 } });
      if (args.where.createdAt) return Promise.resolve({ _sum: { totalAmount: 400000 } });
      return Promise.resolve({
        _sum: { totalAmount: 500000, grossAmount: 500000, netAmount: 480000 },
        _count: 2,
        _avg: { totalAmount: 250000 },
      });
    });
    orderGroupBy.mockReset().mockResolvedValue([
      { orderStatus: 'PENDING', _count: { _all: 1 } },
      { orderStatus: 'DELIVERED', _count: { _all: 2 } },
      { orderStatus: 'CANCELLED', _count: { _all: 1 } },
    ]);
    orderFindMany.mockReset().mockResolvedValue([]);
    refundAggregate.mockReset().mockResolvedValue({ _sum: { amount: 10000 } });
    productFindMany.mockReset().mockResolvedValue([]);
    requireAdmin.mockReset().mockResolvedValue(null);
    unstableCache.mockReset();
  });

  it('returns dashboard metrics from a reduced set of cached parallel queries', async () => {
    const response = await GET(request());
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      revenue: 500000,
      orders: 4,
      pending: 1,
      paidOrders: 2,
      averageOrderValue: 250000,
      cancelledDeductions: 20000,
      refundDeductions: 10000,
      netRevenue: 450000,
      gmvGrowthPercent: 100,
      lowStock: 0,
      partialMetrics: [],
    });
    expect(orderAggregate).toHaveBeenCalledTimes(4);
    expect(orderGroupBy).toHaveBeenCalledOnce();
    expect(orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 5,
      select: expect.objectContaining({ orderCode: true, totalAmount: true }),
    }));
    expect(unstableCache).toHaveBeenCalledTimes(8);
    expect(unstableCache).toHaveBeenCalledWith(expect.any(Array), { revalidate: 60 });
  });

  it('keeps other dashboard metrics available when one metric fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    refundAggregate.mockRejectedValueOnce(new Error('refund query timed out'));

    const response = await GET(request());
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.revenue).toBe(500000);
    expect(result.partialMetrics).toContain('refunds');
    expect(result.refundDeductions).toBe(0);
    expect(log).toHaveBeenCalledWith('Admin dashboard metric failed (refunds):', expect.any(Error));
    log.mockRestore();
  });

  it('times out a stalled metric without blocking the other report values', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    refundAggregate.mockImplementationOnce(() => new Promise(() => undefined));
    const responsePromise = GET(request());

    await vi.advanceTimersByTimeAsync(2500);
    const response = await responsePromise;
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.orders).toBe(4);
    expect(result.partialMetrics).toContain('refunds');
    expect(log).toHaveBeenCalledWith('Admin dashboard metric failed (refunds):', expect.objectContaining({ message: 'Dashboard metric timed out' }));
    log.mockRestore();
    vi.useRealTimers();
  });
});