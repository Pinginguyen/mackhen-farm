import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Nội dung phản hồi không hợp lệ.' } }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)
    || !('adminReply' in payload) || typeof payload.adminReply !== 'string' || payload.adminReply.trim().length > 2000) {
    return NextResponse.json({ error: { message: 'Phản hồi tối đa 2.000 ký tự.' } }, { status: 400 });
  }

  const adminReply = payload.adminReply.trim();
  return withDatabase(async () => {
    try {
      const current = await prisma.review.findUnique({ where: { id: params.id }, select: { adminReply: true } });
      if (!current) return NextResponse.json({ error: { message: 'Không tìm thấy đánh giá.' } }, { status: 404 });
      const item = await prisma.review.update({
        where: { id: params.id },
        data: { adminReply: adminReply || null, adminReplyAt: adminReply ? new Date() : null },
        select: { id: true, adminReply: true, adminReplyAt: true },
      });
      await writeAuditLog(request, {
        adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
        action: adminReply ? 'REPLY_TO_REVIEW' : 'REMOVE_REVIEW_REPLY',
        targetEntity: 'Review',
        targetId: item.id,
        oldValue: { adminReply: current.adminReply },
        newValue: { adminReply: item.adminReply, adminReplyAt: item.adminReplyAt?.toISOString() ?? null },
      });
      return NextResponse.json({ item });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: { message: 'Không tìm thấy đánh giá.' } }, { status: 404 });
      }
      throw error;
    }
  }, 'Admin review reply failed');
}
