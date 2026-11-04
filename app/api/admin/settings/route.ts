import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

function parseSettings(value: unknown): { freeShippingThreshold?: number; tasteGuaranteeText?: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const settings: { freeShippingThreshold?: number; tasteGuaranteeText?: string } = {};

  if (body.freeShippingThreshold !== undefined) {
    if (typeof body.freeShippingThreshold !== 'number' || !Number.isSafeInteger(body.freeShippingThreshold)
      || body.freeShippingThreshold < 0 || body.freeShippingThreshold > 100_000_000) return null;
    settings.freeShippingThreshold = body.freeShippingThreshold;
  }
  if (body.tasteGuaranteeText !== undefined) {
    if (typeof body.tasteGuaranteeText !== 'string' || !body.tasteGuaranteeText.trim() || body.tasteGuaranteeText.trim().length > 2000) return null;
    settings.tasteGuaranteeText = body.tasteGuaranteeText.trim();
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
  if (!settings) return NextResponse.json({ error: 'Ngưỡng freeship hoặc nội dung bảo hiểm vị giác không hợp lệ.' }, { status: 400 });

  return withDatabase(async () => {
    const current = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
    const updated = await prisma.systemSetting.update({ where: { id: 'default' }, data: settings });
    await writeAuditLog(request, {
      adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
      action: 'UPDATE_SYSTEM_SETTINGS',
      targetEntity: 'SystemSetting',
      targetId: 'default',
      oldValue: { freeShippingThreshold: current.freeShippingThreshold, tasteGuaranteeText: current.tasteGuaranteeText },
      newValue: { freeShippingThreshold: updated.freeShippingThreshold, tasteGuaranteeText: updated.tasteGuaranteeText },
    });
    return NextResponse.json({ settings: updated });
  }, 'Admin system settings update failed');
}