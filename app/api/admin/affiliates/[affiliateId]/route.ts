import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';

const deletionBlockedMessage = 'Không thể xóa KOC đã phát sinh đơn hàng hoặc lịch sử thanh toán. Vui lòng dùng chức năng Tạm khóa.';

export async function DELETE(_request: Request, { params }: { params: { affiliateId: string } }) {
  const denied = await requireAdmin(_request);
  if (denied) return denied;

  const affiliateId = params.affiliateId.trim();
  if (!affiliateId) return NextResponse.json({ success: false, message: 'Thiếu mã tài khoản KOC.' }, { status: 400 });

  return withDatabase(async () => {
    try {
      const result = await prisma.$transaction(async (transaction) => {
        const affiliate = await transaction.affiliate.findUnique({
          where: { id: affiliateId },
          select: { id: true, userId: true, affiliateCode: true },
        });
        if (!affiliate) return { status: 'NOT_FOUND' as const };

        const [orderCount, payoutCount] = await Promise.all([
          transaction.order.count({ where: { affiliateCode: affiliate.affiliateCode } }),
          transaction.affiliatePayout.count({ where: { affiliateId: affiliate.id } }),
        ]);
        if (orderCount > 0 || payoutCount > 0) return { status: 'BLOCKED' as const };

        await transaction.user.delete({ where: { id: affiliate.userId } });
        return { status: 'DELETED' as const, affiliate };
      }, { isolationLevel: 'Serializable' });

      if (result.status === 'NOT_FOUND') {
        return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản KOC.' }, { status: 404 });
      }
      if (result.status === 'BLOCKED') {
        return NextResponse.json({ success: false, message: deletionBlockedMessage }, { status: 400 });
      }

      await writeAuditLog(_request, {
        adminEmail: getRequestSession(_request)?.email ?? 'unknown-admin',
        action: 'DELETE_AFFILIATE',
        targetEntity: 'Affiliate',
        targetId: result.affiliate.affiliateCode,
        oldValue: result.affiliate,
      });
      return NextResponse.json({ success: true, message: 'Đã xóa KOC thành công' });
    } catch (error) {
      const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
      if (code === 'P2003') {
        return NextResponse.json({ success: false, message: deletionBlockedMessage }, { status: 400 });
      }
      if (code === 'P2034') {
        return NextResponse.json({ success: false, message: 'Dữ liệu KOC vừa được cập nhật. Vui lòng tải lại danh sách rồi thử lại.' }, { status: 409 });
      }
      throw error;
    }
  }, 'Affiliate deletion failed');
}