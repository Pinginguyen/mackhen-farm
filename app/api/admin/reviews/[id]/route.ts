import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';
import { sendReviewRewardEmail } from '@/lib/email';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu duyệt đánh giá không hợp lệ.' } }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)
    || !('status' in payload) || !['APPROVED', 'REJECTED'].includes(String(payload.status))) {
    return NextResponse.json({ error: { message: 'Trạng thái duyệt không hợp lệ.' } }, { status: 400 });
  }
  const nextStatus = payload.status as 'APPROVED' | 'REJECTED';

  return withDatabase(async () => {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.review.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          status: true,
          rewardVoucherCode: true,
          customerName: true,
          order: { select: { user: { select: { email: true } }, customer: { select: { email: true } } } },
        },
      });
      if (!current) return { error: 'NOT_FOUND' as const };
      if (current.status === nextStatus) return { item: current, voucherCode: current.rewardVoucherCode, recipient: null, newlyApproved: false };
      if (current.status !== 'PENDING') return { error: 'FINAL_STATUS' as const };

      let voucherCode = nextStatus === 'APPROVED' ? current.rewardVoucherCode : null;
      let expiresAt: Date | null = null;
      if (nextStatus === 'APPROVED' && !voucherCode) {
        voucherCode = `REV-${randomBytes(6).toString('hex').toUpperCase()}`;
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await transaction.voucher.create({
          data: {
            code: voucherCode,
            name: 'Voucher cảm ơn đánh giá sản phẩm',
            discountType: 'PERCENTAGE',
            value: 10,
            maxDiscount: 30_000,
            minSpend: 100_000,
            usageLimit: 1,
            expiresAt,
          },
        });
      }
      const item = await transaction.review.update({
        where: { id: current.id },
        data: { status: nextStatus, ...(nextStatus === 'APPROVED' ? { rewardVoucherCode: voucherCode } : {}) },
        select: { id: true, status: true, rewardVoucherCode: true },
      });
      return {
        item,
        oldStatus: current.status,
        voucherCode,
        expiresAt,
        recipient: current.order?.user?.email ?? current.order?.customer?.email ?? null,
        customerName: current.customerName,
        newlyApproved: nextStatus === 'APPROVED',
      };
    });
    if ('error' in result) return NextResponse.json({ error: { message: result.error === 'NOT_FOUND' ? 'Không tìm thấy đánh giá.' : 'Đánh giá đã được xử lý trước đó.' } }, { status: result.error === 'NOT_FOUND' ? 404 : 409 });

    await writeAuditLog(request, {
      adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
      action: nextStatus === 'APPROVED' ? 'APPROVE_REVIEW' : 'REJECT_REVIEW',
      targetEntity: 'Review',
      targetId: result.item.id,
      oldValue: { status: result.oldStatus },
      newValue: { status: nextStatus, rewardVoucherCode: result.voucherCode },
    });

    let emailSent = false;
    if (result.newlyApproved && result.voucherCode && result.expiresAt && result.recipient) {
      try {
        await sendReviewRewardEmail({ toEmail: result.recipient, customerName: result.customerName ?? 'Khách hàng', voucherCode: result.voucherCode, expiresAt: result.expiresAt });
        emailSent = true;
      } catch (error) {
        console.error('Review reward email failed.', error instanceof Error ? error.name : 'UnknownError');
      }
    }
    return NextResponse.json({ item: result.item, voucherCode: result.voucherCode, emailSent });
  }, 'Admin review moderation failed');
}