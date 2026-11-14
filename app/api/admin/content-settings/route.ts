import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { withDatabase } from '@/lib/api-database';
import { writeAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { CORE_CONTENT_SETTING_KEYS, getCoreContentSettings, type CoreContentSettings } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

const textLimits = {
  announcementBarText: 300,
  contactHotline: 40,
  contactZalo: 300,
  businessName: 200,
  businessTaxCode: 200,
  bctVerifiedUrl: 500,
  homePromoTitle: 200,
  homePromoVoucherCode: 80,
} as const;

function isWebUrl(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function parseContentSettings(value: unknown): Partial<CoreContentSettings> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const settings: Partial<CoreContentSettings> = {};

  if (body.announcementBarEnabled !== undefined) {
    if (typeof body.announcementBarEnabled !== 'boolean') return null;
    settings.announcementBarEnabled = body.announcementBarEnabled;
  }

  for (const [field, maxLength] of Object.entries(textLimits) as [keyof typeof textLimits, number][]) {
    const input = body[field];
    if (input === undefined) continue;
    if (typeof input !== 'string' || !input.trim() || input.trim().length > maxLength) return null;
    settings[field] = input.trim();
  }

  if (settings.contactZalo && !isWebUrl(settings.contactZalo) && !/^[+\d\s().-]+$/.test(settings.contactZalo)) return null;
  if (settings.bctVerifiedUrl && !isWebUrl(settings.bctVerifiedUrl)) return null;
  return Object.keys(settings).length ? settings : null;
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu cài đặt không hợp lệ.' }, { status: 400 });
  }
  const settings = parseContentSettings(body);
  if (!settings) return NextResponse.json({ error: 'Thông tin cài đặt không hợp lệ.' }, { status: 400 });

  return withDatabase(async () => {
    const previousSettings = await getCoreContentSettings();
    await Promise.all(Object.entries(settings).map(([field, value]) => {
      const key = CORE_CONTENT_SETTING_KEYS[field as keyof CoreContentSettings];
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }));

    const updatedSettings = await getCoreContentSettings();
    revalidatePath('/', 'layout');
    revalidatePath('/');
    await writeAuditLog(request, {
      adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
      action: 'UPDATE_CORE_CONTENT_SETTINGS',
      targetEntity: 'SystemSetting',
      targetId: 'storefront-content',
      oldValue: previousSettings,
      newValue: updatedSettings,
    });
    return NextResponse.json({ settings: updatedSettings });
  }, 'Core content settings update failed');
}
