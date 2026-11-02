import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clickCount, orderFindMany, requireAffiliate } = vi.hoisted(() => ({ clickCount: vi.fn(), orderFindMany: vi.fn(), requireAffiliate: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { affiliateClick: { count: clickCount }, order: { findMany: orderFindMany } } }));
vi.mock('@/lib/affiliate-auth', () => ({ requireAffiliate }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET } from './route';

describe('GET /api/affiliate/dashboard', () => {
  beforeEach(() => {
    requireAffiliate.mockReset().mockResolvedValue({ affiliate: { id: 'affiliate-1', affiliateCode: 'KOC_TAYBAC', commissionRate: 12, user: { name: 'Tu Trinh', email: 'tu@example.com' } } });
    clickCount.mockReset().mockResolvedValue(24);
    orderFindMany.mockReset().mockResolvedValue([
      { orderCode: 'MKF-111111', createdAt: new Date('2026-11-01T00:00:00.000Z'), totalAmount: 10000, paymentStatus: 'PAID', orderStatus: 'PROCESSING', affiliateCommissionRate: 15, affiliateCommissionPaidAt: null, affiliatePayout: null },
      { orderCode: 'MKF-222222', createdAt: new Date('2026-11-02T00:00:00.000Z'), totalAmount: 20000, paymentStatus: 'PAID', orderStatus: 'COMPLETED', affiliateCommissionRate: 10, affiliateCommissionPaidAt: new Date(), affiliatePayout: { paymentReference: 'BANK-001' } },
      { orderCode: 'MKF-333333', createdAt: new Date('2026-11-03T00:00:00.000Z'), totalAmount: 30000, paymentStatus: 'PENDING', orderStatus: 'PENDING', affiliateCommissionRate: 12, affiliateCommissionPaidAt: null, affiliatePayout: null },
    ]);
  });

  it('returns live clicks, paid-order commission, and payout status history', async () => {
    const response = await GET(new Request('https://mackhen.example/api/affiliate/dashboard'));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ totalClicks: 24, completedOrders: 2, totalRevenue: 30000, commissionAccrued: 3500, commissionDue: 1500 });
    expect(result.orders[0]).toMatchObject({ commission: 1500, commissionStatus: 'Chờ đối soát' });
    expect(result.orders[1]).toMatchObject({ commission: 2000, commissionStatus: 'Đã chi trả', paymentReference: 'BANK-001' });
    expect(result.orders[2]).toMatchObject({ commission: 0, commissionStatus: 'Chờ thanh toán đơn' });
  });

  it('returns the affiliate access guard response without querying dashboard data', async () => {
    requireAffiliate.mockResolvedValueOnce({ denied: new Response('Forbidden', { status: 403 }) });
    const response = await GET(new Request('https://mackhen.example/api/affiliate/dashboard'));

    expect(response.status).toBe(403);
    expect(clickCount).not.toHaveBeenCalled();
    expect(orderFindMany).not.toHaveBeenCalled();
  });
});