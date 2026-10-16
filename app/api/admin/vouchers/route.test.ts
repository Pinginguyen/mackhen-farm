import { beforeEach, describe, expect, it, vi } from 'vitest';

const { voucherFindMany, voucherCreate, voucherUpdate, voucherDelete, requireAdmin, writeAuditLog, prisma } = vi.hoisted(() => {
  const voucherFindMany = vi.fn();
  const voucherCreate = vi.fn();
  const voucherUpdate = vi.fn();
  const voucherDelete = vi.fn();
  const requireAdmin = vi.fn();
  const writeAuditLog = vi.fn();
  return {
    voucherFindMany,
    voucherCreate,
    voucherUpdate,
    voucherDelete,
    requireAdmin,
    writeAuditLog,
    prisma: { voucher: { findMany: voucherFindMany, create: voucherCreate, update: voucherUpdate, delete: voucherDelete } },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));
vi.mock('@/lib/auth', () => ({ getRequestSession: () => ({ email: 'admin@example.com' }) }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));

import { DELETE, GET, PATCH, POST } from './route';

const voucherDraft = {
  code: 'TET2026',
  discountType: 'PERCENTAGE',
  value: 15,
  maxDiscount: 50000,
  minSpend: 200000,
  usageLimit: 25,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
};

function request(method: string, body?: unknown, url = 'https://mackhen.example/api/admin/vouchers') {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('/api/admin/vouchers', () => {
  beforeEach(() => {
    voucherFindMany.mockReset().mockResolvedValue([]);
    voucherCreate.mockReset().mockResolvedValue({ id: 'voucher-1', ...voucherDraft });
    voucherUpdate.mockReset().mockResolvedValue({ id: 'voucher-1', ...voucherDraft, value: 20 });
    voucherDelete.mockReset().mockResolvedValue({ id: 'voucher-1', ...voucherDraft, expiresAt: new Date(voucherDraft.expiresAt) });
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it('requires admin access to list vouchers', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const response = await GET(request('GET'));

    expect(response.status).toBe(403);
    expect(voucherFindMany).not.toHaveBeenCalled();
  });

  it('lists persisted vouchers in an admin view', async () => {
    voucherFindMany.mockResolvedValueOnce([{ id: 'voucher-1', code: 'TET2026' }]);
    const response = await GET(request('GET'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [{ id: 'voucher-1', code: 'TET2026' }] });
  });

  it('creates a validated voucher and writes an audit record', async () => {
    const response = await POST(request('POST', voucherDraft));
    const result = await response.json() as { item: { code: string } };

    expect(response.status).toBe(201);
    expect(result.item.code).toBe('TET2026');
    expect(voucherCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ code: 'TET2026', discountType: 'PERCENTAGE', value: 15, maxDiscount: 50000, usageLimit: 25 }) });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'CREATE_VOUCHER', targetEntity: 'Voucher' }));
  });

  it('rejects percentage values above 100 before writing', async () => {
    const response = await POST(request('POST', { ...voucherDraft, value: 101 }));

    expect(response.status).toBe(400);
    expect(voucherCreate).not.toHaveBeenCalled();
  });

  it('requires a maximum discount for percentage vouchers', async () => {
    const response = await POST(request('POST', { ...voucherDraft, maxDiscount: null }));

    expect(response.status).toBe(400);
    expect(voucherCreate).not.toHaveBeenCalled();
  });

  it('requires a future expiry and a positive usage limit', async () => {
    const expiredResponse = await POST(request('POST', { ...voucherDraft, expiresAt: '2020-01-01T00:00:00.000Z' }));
    const invalidLimitResponse = await POST(request('POST', { ...voucherDraft, usageLimit: 0 }));

    expect(expiredResponse.status).toBe(400);
    expect(invalidLimitResponse.status).toBe(400);
    expect(voucherCreate).not.toHaveBeenCalled();
  });

  it('updates an existing voucher', async () => {
    const response = await PATCH(request('PATCH', { id: 'voucher-1', ...voucherDraft, value: 20 }));

    expect(response.status).toBe(200);
    expect(voucherUpdate).toHaveBeenCalledWith({ where: { id: 'voucher-1' }, data: expect.objectContaining({ value: 20 }) });
  });

  it('deletes a voucher by id', async () => {
    const response = await DELETE(request('DELETE', undefined, 'https://mackhen.example/api/admin/vouchers?id=voucher-1'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(voucherDelete).toHaveBeenCalledWith({ where: { id: 'voucher-1' } });
  });
});