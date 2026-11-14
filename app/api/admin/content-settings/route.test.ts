import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsFindMany, settingsUpsert, profileFindUnique, requireAdmin, writeAuditLog } = vi.hoisted(() => ({
  settingsFindMany: vi.fn(),
  settingsUpsert: vi.fn(),
  profileFindUnique: vi.fn(),
  requireAdmin: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {
  systemSetting: { findMany: settingsFindMany, upsert: settingsUpsert },
  storeProfileSettings: { findUnique: profileFindUnique },
} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('@/lib/api-database', () => ({ withDatabase: (operation: () => Promise<Response>) => operation() }));

import { PATCH } from './route';
import { CORE_CONTENT_SETTING_KEYS, DEFAULT_CORE_CONTENT_SETTINGS, type CoreContentSettings } from '@/lib/system-settings';

function request(body: unknown) {
  return new Request('https://mackhen.example/api/admin/content-settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/admin/content-settings', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null);
    writeAuditLog.mockReset().mockResolvedValue(undefined);
    settingsFindMany.mockReset().mockResolvedValue([]);
    settingsUpsert.mockReset().mockResolvedValue({});
    profileFindUnique.mockReset().mockResolvedValue({ companyName: 'Business', taxCode: '123', hotline: '0900000000' });
  });

  it('requires an admin before reading or writing content settings', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const response = await PATCH(request({ announcementBarText: 'Freeship toàn quốc' }));

    expect(response.status).toBe(403);
    expect(settingsUpsert).not.toHaveBeenCalled();
  });

  it('saves all core values as key-value rows and audits the change', async () => {
    const content: CoreContentSettings = {
      ...DEFAULT_CORE_CONTENT_SETTINGS,
      announcementBarText: 'Freeship toàn quốc từ 300k',
      announcementBarEnabled: false,
      contactHotline: '0900000000',
      contactZalo: 'https://zalo.me/0900000000',
      businessName: 'Mắc Khén Farm',
      businessTaxCode: '0100000000',
      bctVerifiedUrl: 'https://online.gov.vn',
      homePromoTitle: 'Combo mới',
      homePromoVoucherCode: 'COMBO20',
    };
    settingsFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(Object.entries(content).map(([field, value]) => ({
        key: CORE_CONTENT_SETTING_KEYS[field as keyof CoreContentSettings],
        value: String(value),
      })));

    const response = await PATCH(request(content));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(settingsUpsert).toHaveBeenCalledTimes(9);
    expect(settingsUpsert).toHaveBeenCalledWith({
      where: { key: 'ANNOUNCEMENT_BAR_ENABLED' },
      update: { value: 'false' },
      create: { key: 'ANNOUNCEMENT_BAR_ENABLED', value: 'false' },
    });
    expect(result.settings).toEqual(content);
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'UPDATE_CORE_CONTENT_SETTINGS', targetEntity: 'SystemSetting' }));
  });

  it('rejects invalid URLs and empty required text', async () => {
    expect((await PATCH(request({ bctVerifiedUrl: 'javascript:alert(1)' }))).status).toBe(400);
    expect((await PATCH(request({ homePromoTitle: '   ' }))).status).toBe(400);
    expect(settingsUpsert).not.toHaveBeenCalled();
  });
});
