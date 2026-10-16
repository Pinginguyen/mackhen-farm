import { beforeEach, describe, expect, it, vi } from 'vitest';

const { voucherFindMany, ensureCoreVouchers } = vi.hoisted(() => ({ voucherFindMany: vi.fn(), ensureCoreVouchers: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { voucher: { findMany: voucherFindMany } } }));
vi.mock('@/lib/ensure-core-vouchers', () => ({ ensureCoreVouchers }));

import { GET } from './route';

describe('GET /api/vouchers', () => {
  beforeEach(() => {
    voucherFindMany.mockReset().mockResolvedValue([]);
    ensureCoreVouchers.mockReset().mockResolvedValue(undefined);
  });

  it('only queries active public vouchers and hides exhausted vouchers', async () => {
    voucherFindMany.mockResolvedValueOnce([
      { id: 'available', usedCount: 2, usageLimit: 5 },
      { id: 'exhausted', usedCount: 5, usageLimit: 5 },
      { id: 'unlimited', usedCount: 12, usageLimit: null },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(ensureCoreVouchers).toHaveBeenCalledOnce();
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

  it('returns a readable string when the voucher database is unavailable', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    voucherFindMany.mockRejectedValueOnce(new Error('database offline'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: 'Lỗi kết nối cơ sở dữ liệu' });
    expect(log).toHaveBeenCalledWith('Voucher database operation failed:', expect.any(Error));
    log.mockRestore();
  });
});