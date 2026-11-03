import { beforeEach, describe, expect, it, vi } from 'vitest';

const { affiliateFindUnique, orderCount, payoutCount, userDelete, requireAdmin, writeAuditLog, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    affiliateFindUnique: vi.fn(),
    orderCount: vi.fn(),
    payoutCount: vi.fn(),
    userDelete: vi.fn(),
    requireAdmin: vi.fn(),
    writeAuditLog: vi.fn(),
  };
  const tx = {
    affiliate: { findUnique: mocks.affiliateFindUnique },
    order: { count: mocks.orderCount },
    affiliatePayout: { count: mocks.payoutCount },
    user: { delete: mocks.userDelete },
  };
  const db = {
    $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { ...mocks, transaction: tx, prisma: db };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/auth', () => ({ getRequestSession: vi.fn(() => ({ email: 'admin@example.com' })) }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { DELETE } from './route';

function makeRequest() {
  return new Request('https://mackhen.example/api/admin/affiliates/affiliate-1', { method: 'DELETE' });
}

describe('DELETE /api/admin/affiliates/[affiliateId]', () => {
  beforeEach(() => {
    affiliateFindUnique.mockReset().mockResolvedValue({ id: 'affiliate-1', userId: 'user-1', affiliateCode: 'KOC_TEST' });
    orderCount.mockReset().mockResolvedValue(0);
    payoutCount.mockReset().mockResolvedValue(0);
    userDelete.mockReset().mockResolvedValue({ id: 'user-1' });
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
    prisma.$transaction.mockClear();
  });

  it('requires an admin', async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 403 }));
    const response = await DELETE(makeRequest(), { params: { affiliateId: 'affiliate-1' } });

    expect(response.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deletes the affiliate user when there are no attributed orders or payouts', async () => {
    const response = await DELETE(makeRequest(), { params: { affiliateId: 'affiliate-1' } });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toEqual({ success: true, message: 'Đã xóa KOC thành công' });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'DELETE_AFFILIATE', targetId: 'KOC_TEST' }));
  });

  it('blocks deletion when the affiliate has attributed orders', async () => {
    orderCount.mockResolvedValue(1);
    const response = await DELETE(makeRequest(), { params: { affiliateId: 'affiliate-1' } });
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.message).toContain('đã phát sinh đơn hàng');
    expect(userDelete).not.toHaveBeenCalled();
  });

  it('blocks deletion when the affiliate has payout history', async () => {
    payoutCount.mockResolvedValue(1);
    const response = await DELETE(makeRequest(), { params: { affiliateId: 'affiliate-1' } });

    expect(response.status).toBe(400);
    expect(userDelete).not.toHaveBeenCalled();
  });

  it('returns not found when the affiliate id does not exist', async () => {
    affiliateFindUnique.mockResolvedValue(null);
    const response = await DELETE(makeRequest(), { params: { affiliateId: 'missing' } });

    expect(response.status).toBe(404);
    expect(userDelete).not.toHaveBeenCalled();
  });

  it('maps a foreign-key delete failure to a safe client error', async () => {
    userDelete.mockRejectedValue(Object.assign(new Error('Foreign key constraint failed'), { code: 'P2003' }));
    const response = await DELETE(makeRequest(), { params: { affiliateId: 'affiliate-1' } });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain('Vui lòng dùng chức năng Tạm khóa');
  });
});