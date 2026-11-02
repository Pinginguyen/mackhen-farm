import { beforeEach, describe, expect, it, vi } from 'vitest';

const { affiliateFindUnique, orderFindMany, orderUpdateMany, payoutCreate, requireAdmin, writeAuditLog, prisma } = vi.hoisted(() => {
  const mocks = { affiliateFindUnique: vi.fn(), orderFindMany: vi.fn(), orderUpdateMany: vi.fn(), payoutCreate: vi.fn(), requireAdmin: vi.fn(), writeAuditLog: vi.fn() };
  const tx = {
    affiliate: { findUnique: mocks.affiliateFindUnique },
    order: { findMany: mocks.orderFindMany, updateMany: mocks.orderUpdateMany },
    affiliatePayout: { create: mocks.payoutCreate },
  };
  return { ...mocks, prisma: { $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { POST } from './route';

describe('POST /api/admin/affiliates/[affiliateId]/payout', () => {
  beforeEach(() => {
    affiliateFindUnique.mockReset().mockResolvedValue({ id: 'affiliate-1', affiliateCode: 'KOC_TAYBAC', commissionRate: 12, bankAccount: '0123456789' });
    orderFindMany.mockReset().mockResolvedValue([{ id: 'order-1', totalAmount: 100000, affiliateCommissionRate: 12 }]);
    orderUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    payoutCreate.mockReset().mockResolvedValue({ id: 'payout-1', amount: 12000, orderCount: 1, paidAt: new Date('2026-11-03T00:00:00.000Z') });
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it('settles only unpaid commissions and records the bank snapshot', async () => {
    const response = await POST(new Request('https://mackhen.example/api/admin/affiliates/affiliate-1/payout', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentReference: 'BANK-001' }),
    }), { params: { affiliateId: 'affiliate-1' } });

    expect(response.status).toBe(200);
    expect(orderFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ paymentStatus: 'PAID', affiliateCommissionPaidAt: null }) }));
    expect(payoutCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: 12000, orderCount: 1, bankAccountSnapshot: '0123456789', paymentReference: 'BANK-001' }) }));
    expect(orderUpdateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: { affiliatePayoutId: 'payout-1' } }));
  });

  it('does not create another payout when no commissions are due', async () => {
    orderFindMany.mockResolvedValueOnce([]);
    const response = await POST(new Request('https://mackhen.example/api/admin/affiliates/affiliate-1/payout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), { params: { affiliateId: 'affiliate-1' } });

    expect(response.status).toBe(409);
    expect(payoutCreate).not.toHaveBeenCalled();
  });

  it('rejects concurrent settlement when another request already claimed the orders', async () => {
    orderUpdateMany.mockResolvedValueOnce({ count: 0 });
    const response = await POST(new Request('https://mackhen.example/api/admin/affiliates/affiliate-1/payout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), { params: { affiliateId: 'affiliate-1' } });

    expect(response.status).toBe(409);
    expect(payoutCreate).not.toHaveBeenCalled();
  });
});