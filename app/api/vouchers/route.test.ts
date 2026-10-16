import { beforeEach, describe, expect, it, vi } from 'vitest';

const { voucherFindMany } = vi.hoisted(() => ({ voucherFindMany: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { voucher: { findMany: voucherFindMany } } }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET } from './route';

describe('GET /api/vouchers', () => {
  beforeEach(() => voucherFindMany.mockReset().mockResolvedValue([]));

  it('only queries active public vouchers and hides exhausted vouchers', async () => {
    voucherFindMany.mockResolvedValueOnce([
      { id: 'available', usedCount: 2, usageLimit: 5 },
      { id: 'exhausted', usedCount: 5, usageLimit: 5 },
      { id: 'unlimited', usedCount: 12, usageLimit: null },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(voucherFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        showOnPromoPage: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
      }),
    }));
    expect(await response.json()).toEqual({ items: [
      { id: 'available' },
      { id: 'unlimited' },
    ] });
  });
});