import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsUpsert, settingsUpdate, requireAdmin, writeAuditLog } = vi.hoisted(() => ({
  settingsUpsert: vi.fn(),
  settingsUpdate: vi.fn(),
  requireAdmin: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { systemSetting: { upsert: settingsUpsert, update: settingsUpdate } } }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { GET, PATCH } from './route';

function request(body?: unknown) {
  return new Request('https://mackhen.example/api/admin/settings', {
    method: body ? 'PATCH' : 'GET',
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
}

describe('/api/admin/settings', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
    settingsUpsert.mockReset().mockResolvedValue({ id: 'default', freeShippingThreshold: 250000, tasteGuaranteeText: 'Default taste guarantee' });
    settingsUpdate.mockReset().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'default', freeShippingThreshold: 300000, tasteGuaranteeText: 'Updated guarantee', ...data }));
  });

  it('requires an admin to read settings', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(settingsUpsert).not.toHaveBeenCalled();
  });

  it('updates both storefront policies and records an audit event', async () => {
    const response = await PATCH(request({ freeShippingThreshold: 300000, tasteGuaranteeText: 'Updated guarantee' }));

    expect(response.status).toBe(200);
    expect(settingsUpdate).toHaveBeenCalledWith({ where: { id: 'default' }, data: { freeShippingThreshold: 300000, tasteGuaranteeText: 'Updated guarantee' } });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'UPDATE_SYSTEM_SETTINGS', targetEntity: 'SystemSetting' }));
  });

  it('rejects invalid shipping thresholds and blank guarantee text', async () => {
    expect((await PATCH(request({ freeShippingThreshold: -1 }))).status).toBe(400);
    expect((await PATCH(request({ tasteGuaranteeText: '   ' }))).status).toBe(400);
    expect(settingsUpdate).not.toHaveBeenCalled();
  });
});