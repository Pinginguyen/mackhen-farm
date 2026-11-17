import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { orderUpdateMany } = vi.hoisted(() => ({ orderUpdateMany: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { order: { updateMany: orderUpdateMany } } }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET, POST } from './route';

const secret = 'affiliate-cron-test-secret';

describe('/api/cron/affiliate-commission-holds', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', secret);
    orderUpdateMany.mockReset().mockResolvedValue({ count: 2 });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('requires the cron bearer secret', async () => {
    const response = await POST(new Request('https://mackhen.example/api/cron/affiliate-commission-holds', { method: 'POST' }));

    expect(response.status).toBe(401);
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });

  it('promotes only paid, delivered commissions past the hold and without open return cases', async () => {
    const response = await GET(new Request('https://mackhen.example/api/cron/affiliate-commission-holds', {
      headers: { authorization: `Bearer ${secret}` },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, eligibleOrders: 2 });
    expect(orderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        affiliateCommissionStatus: 'PENDING',
        affiliateCommissionEligibleAt: { lte: expect.any(Date) },
        paymentStatus: 'PAID',
        orderStatus: { in: ['DELIVERED', 'COMPLETED'] },
        returnRequests: { none: { status: { in: ['PENDING', 'REPLACEMENT_APPROVED', 'REFUND_APPROVED'] } } },
      }),
      data: { affiliateCommissionStatus: 'ELIGIBLE' },
    }));
  });
});