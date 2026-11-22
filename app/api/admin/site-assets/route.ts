import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { ensureSiteAssets } from '@/lib/site-assets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    await ensureSiteAssets();
    const items = await prisma.siteAsset.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Admin site asset listing failed:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách hình ảnh.' }, { status: 503 });
  }
}

function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu hình ảnh không hợp lệ.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Dữ liệu hình ảnh không hợp lệ.' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (typeof data.key !== 'string' || !/^[A-Z0-9_]{2,80}$/.test(data.key) || !isValidImageUrl(data.imageUrl)) {
    return NextResponse.json({ error: 'Vị trí hoặc URL hình ảnh không hợp lệ.' }, { status: 400 });
  }
  if (data.altText !== undefined && data.altText !== null
    && (typeof data.altText !== 'string' || data.altText.trim().length > 500)) {
    return NextResponse.json({ error: 'Mô tả ảnh không hợp lệ.' }, { status: 400 });
  }

  try {
    const current = await prisma.siteAsset.findUnique({ where: { key: data.key } });
    if (!current) return NextResponse.json({ error: 'Không tìm thấy vị trí hình ảnh.' }, { status: 404 });

    const updated = await prisma.siteAsset.update({
      where: { key: data.key },
      data: {
        imageUrl: data.imageUrl.trim(),
        ...(data.altText === undefined ? {} : { altText: typeof data.altText === 'string' ? data.altText.trim() || null : null }),
      },
    });
    revalidateTag(`site-asset:${data.key}`);
    revalidatePath('/', 'layout');
    revalidatePath('/admin/media');
    await writeAuditLog(request, {
      adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
      action: 'UPDATE_SITE_ASSET',
      targetEntity: 'SiteAsset',
      targetId: data.key,
      oldValue: current,
      newValue: updated,
    });
    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('Admin site asset update failed:', error);
    return NextResponse.json({ error: 'Không thể lưu hình ảnh.' }, { status: 503 });
  }
}