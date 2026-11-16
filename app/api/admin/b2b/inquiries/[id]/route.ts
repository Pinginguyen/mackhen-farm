import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const inquiryStatuses = ['PENDING', 'CONTACTED', 'RESOLVED', 'CANCELLED'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!params.id || params.id.length > 64) {
    return NextResponse.json({ error: { message: 'Yêu cầu B2B không hợp lệ.' } }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu cập nhật không hợp lệ.' } }, { status: 400 });
  }
  if (!isRecord(payload)) return NextResponse.json({ error: { message: 'Dữ liệu cập nhật không hợp lệ.' } }, { status: 400 });

  const hasStatus = Object.prototype.hasOwnProperty.call(payload, 'status');
  const hasAdminNotes = Object.prototype.hasOwnProperty.call(payload, 'adminNotes');
  const status = payload.status;
  const adminNotes = payload.adminNotes;
  if ((!hasStatus && !hasAdminNotes)
    || (hasStatus && (typeof status !== 'string' || !inquiryStatuses.includes(status as (typeof inquiryStatuses)[number])))
    || (hasAdminNotes && adminNotes !== null && (typeof adminNotes !== 'string' || adminNotes.length > 3000))) {
    return NextResponse.json({ error: { message: 'Trạng thái hoặc ghi chú quản trị không hợp lệ.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const existing = await prisma.b2bInquiry.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: { message: 'Không tìm thấy yêu cầu B2B.' } }, { status: 404 });

    const inquiry = await prisma.b2bInquiry.update({
      where: { id: params.id },
      data: {
        ...(hasStatus ? { status: status as string } : {}),
        ...(hasAdminNotes ? { adminNotes: typeof adminNotes === 'string' ? adminNotes.trim() || null : null } : {}),
      },
      select: { id: true, status: true, adminNotes: true, updatedAt: true },
    });
    return NextResponse.json({ item: inquiry });
  }, 'Admin B2B inquiry update failed.');
}