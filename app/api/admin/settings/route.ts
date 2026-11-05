import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { withDatabase } from '@/lib/api-database';
import type { SystemSettings } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

type EditableSettings = Partial<Omit<SystemSettings, 'id' | 'updatedAt'>>;

function parseSettings(value: unknown): EditableSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const settings: EditableSettings = {};

  if (body.freeShippingThreshold !== undefined) {
    if (typeof body.freeShippingThreshold !== 'number' || !Number.isSafeInteger(body.freeShippingThreshold)
      || body.freeShippingThreshold < 0 || body.freeShippingThreshold > 100_000_000) return null;
    settings.freeShippingThreshold = body.freeShippingThreshold;
  }
  if (body.tasteGuaranteeText !== undefined) {
    if (typeof body.tasteGuaranteeText !== 'string' || !body.tasteGuaranteeText.trim() || body.tasteGuaranteeText.trim().length > 2000) return null;
    settings.tasteGuaranteeText = body.tasteGuaranteeText.trim();
  }
  const textLimits = {
    companyName: 200,
    taxCode: 200,
    representativeName: 150,
    address: 300,
    hotline: 40,
    email: 254,
    dppSupplyGPS: 200,
    dppLabResult: 1000,
  } as const;
  for (const [key, maxLength] of Object.entries(textLimits) as [keyof typeof textLimits, number][]) {
    const field = body[key];
    if (field === undefined) continue;
    if (typeof field !== 'string' || !field.trim() || field.trim().length > maxLength) return null;
    settings[key] = field.trim();
  }
  if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) return null;
  if (body.b2bItemsPerCarton !== undefined) {
    if (typeof body.b2bItemsPerCarton !== 'number' || !Number.isSafeInteger(body.b2bItemsPerCarton)
      || body.b2bItemsPerCarton < 1 || body.b2bItemsPerCarton > 100_000) return null;
    settings.b2bItemsPerCarton = body.b2bItemsPerCarton;
  }
  if (body.b2bCartonWeightKg !== undefined) {
    if (typeof body.b2bCartonWeightKg !== 'number' || !Number.isFinite(body.b2bCartonWeightKg)
      || body.b2bCartonWeightKg <= 0 || body.b2bCartonWeightKg > 10_000) return null;
    settings.b2bCartonWeightKg = body.b2bCartonWeightKg;
  }

  return Object.keys(settings).length ? settings : null;
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const settings = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
    return NextResponse.json({ settings });
  }, 'Admin system settings lookup failed');
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
  const settings = parseSettings(body);
  if (!settings) return NextResponse.json({ error: 'Thông tin cài đặt không hợp lệ hoặc không có thay đổi.' }, { status: 400 });

  return withDatabase(async () => {
    const current = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
    const updated = await prisma.systemSetting.update({ where: { id: 'default' }, data: settings });
    revalidatePath('/', 'layout');
    await writeAuditLog(request, {
      adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
      action: 'UPDATE_SYSTEM_SETTINGS',
      targetEntity: 'SystemSetting',
      targetId: 'default',
      oldValue: current,
      newValue: updated,
    });
    return NextResponse.json({ settings: updated });
  }, 'Admin system settings update failed');
}