import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compare } from 'bcryptjs';

const { affiliateFindMany, affiliateFindUnique, affiliateCreate, affiliateUpdate, userFindUnique, userCreate, orderFindMany, clickGroupBy, requireAdmin, writeAuditLog, transaction, prisma } = vi.hoisted(() => {
  const mocks = {
    affiliateFindMany: vi.fn(), affiliateFindUnique: vi.fn(), affiliateCreate: vi.fn(), affiliateUpdate: vi.fn(),
    userFindUnique: vi.fn(), userCreate: vi.fn(), orderFindMany: vi.fn(), clickGroupBy: vi.fn(),
    requireAdmin: vi.fn(), writeAuditLog: vi.fn(),
  };
  const tx = {
    user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
    affiliate: { findUnique: mocks.affiliateFindUnique, create: mocks.affiliateCreate },
  };
  const db = {
    affiliate: { findMany: mocks.affiliateFindMany, findUnique: mocks.affiliateFindUnique, create: mocks.affiliateCreate, update: mocks.affiliateUpdate },
    order: { findMany: mocks.orderFindMany },
    affiliateClick: { groupBy: mocks.clickGroupBy },
    $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { ...mocks, transaction: tx, prisma: db };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET, PATCH, POST } from './route';

describe('/api/admin/affiliates', () => {
  beforeEach(() => {
    affiliateFindMany.mockReset().mockResolvedValue([{ id: 'affiliate-1', affiliateCode: 'KOC_TAYBAC', commissionRate: 12, bankAccount: '0123456789', active: true, user: { name: 'Tu Trinh', email: 'tu@example.com' } }]);
    affiliateFindUnique.mockReset().mockResolvedValue(null);
    affiliateCreate.mockReset().mockResolvedValue({ id: 'affiliate-1', affiliateCode: 'KOC_TAYBAC', commissionRate: 12, active: true });
    affiliateUpdate.mockReset().mockResolvedValue({ id: 'affiliate-1', affiliateCode: 'KOC_TAYBAC', active: false, user: { name: 'Tu Trinh', email: 'tu@example.com' } });
    userFindUnique.mockReset().mockResolvedValue(null);
    userCreate.mockReset().mockResolvedValue({ id: 'user-1', name: 'Tu Trinh', email: 'tu@example.com' });
    orderFindMany.mockReset().mockResolvedValue([
      { affiliateCode: 'KOC_TAYBAC', totalAmount: 1000, affiliateCommissionRate: 12, affiliateCommissionPaidAt: null },
      { affiliateCode: 'KOC_TAYBAC', totalAmount: 2000, affiliateCommissionRate: 10, affiliateCommissionPaidAt: new Date() },
    ]);
    clickGroupBy.mockReset().mockResolvedValue([{ affiliateId: 'affiliate-1', _count: { _all: 9 } }]);
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it('calculates KOC revenue and unpaid commissions from paid orders', async () => {
    const response = await GET(new Request('https://mackhen.example/api/admin/affiliates'));
    const result = await response.json() as { items: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(result.items[0]).toMatchObject({
      affiliateCode: 'KOC_TAYBAC', totalClicks: 9, completedOrders: 2, revenue: 3000,
      commission: 320, commissionDue: 120, commissionDueOrders: 1,
    });
  });

  it('creates an AFFILIATE user and profile with the admin-provided password hashed by bcrypt', async () => {
    const response = await POST(new Request('https://mackhen.example/api/admin/affiliates', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tu Trinh', email: 'TU@example.com', password: 'KocPass123', affiliateCode: 'tutrinH_food', commissionRate: 12, bankAccount: '0123-456-789' }),
    }));
    const result = await response.json();
    const storedHash = userCreate.mock.calls[0][0].data.password as string;

    expect(response.status).toBe(201);
    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'tu@example.com', role: 'AFFILIATE', password: expect.any(String) }) }));
    expect(storedHash).not.toBe('KocPass123');
    expect(await compare('KocPass123', storedHash)).toBe(true);
    expect(affiliateCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ affiliateCode: 'TUTRINH_FOOD', commissionRate: 12 }) }));
    expect(result).not.toHaveProperty('password');
  });

  it('rejects a password shorter than six characters', async () => {
    const response = await POST(new Request('https://mackhen.example/api/admin/affiliates', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tu Trinh', email: 'tu@example.com', password: '12345', affiliateCode: 'TUTRINH', commissionRate: 10, bankAccount: '01234567' }),
    }));

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('rejects rates outside the allowed onboarding range', async () => {
    const response = await POST(new Request('https://mackhen.example/api/admin/affiliates', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tu Trinh', email: 'tu@example.com', affiliateCode: 'TUTRINH', commissionRate: 80, bankAccount: '01234567' }),
    }));

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('allows admins to suspend an affiliate', async () => {
    const response = await PATCH(new Request('https://mackhen.example/api/admin/affiliates', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ affiliateId: 'affiliate-1', active: false }),
    }));

    expect(response.status).toBe(200);
    expect(affiliateUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'affiliate-1' }, data: { active: false } }));
  });
});