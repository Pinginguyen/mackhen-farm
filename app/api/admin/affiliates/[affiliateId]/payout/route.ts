import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';
import { withDatabase } from '@/lib/api-database';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { calculatePercentageAmount } from '@/lib/money';

export async function POST(request: Request, { params }: { params: { affiliateId: string } }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Thông tin thanh toán không hợp lệ.' } }, { status: 400 });
  }
  const paymentReference = typeof payload === 'object' && payload !== null && 'paymentReference' in payload && typeof payload.paymentReference === 'string'
    ? payload.paymentReference.trim()
    : '';
  if (paymentReference.length > 100) return NextResponse.json({ error: { message: 'Mã giao dịch tối đa 100 ký tự.' } }, { status: 400 });

  return withDatabase(async () => {
    try {
      const payout = await prisma.$transaction(async (transaction) => {
        const affiliate = await transaction.affiliate.findUnique({ where: { id: params.affiliateId } });
        if (!affiliate) return { error: 'NOT_FOUND' as const };
        const orders = await transaction.order.findMany({
          where: { affiliateCode: affiliate.affiliateCode, paymentStatus: 'PAID', orderStatus: { not: 'CANCELLED' }, affiliateCommissionPaidAt: null },
          select: { id: true, totalAmount: true, affiliateCommissionRate: true },
        });
        if (!orders.length) return { error: 'NOTHING_DUE' as const };
        const amount = orders.reduce((sum, order) => sum + calculatePercentageAmount(order.totalAmount, order.affiliateCommissionRate ?? affiliate.commissionRate), 0);
        const paidAt = new Date();
        const settled = await transaction.order.updateMany({
          where: { id: { in: orders.map((order) => order.id) }, affiliateCommissionPaidAt: null },
          data: { affiliateCommissionPaidAt: paidAt },
        });
        if (settled.count !== orders.length) throw new Error('AFFILIATE_PAYOUT_CONFLICT');
        const record = await transaction.affiliatePayout.create({
          data: {
            affiliateId: affiliate.id,
            amount,
            orderCount: orders.length,
            bankAccountSnapshot: affiliate.bankAccount,
            paymentReference: paymentReference || null,
            paidBy: getRequestSession(request)?.email ?? 'unknown-admin',
            paidAt,
          },
        });
        await transaction.order.updateMany({ where: { id: { in: orders.map((order) => order.id) } }, data: { affiliatePayoutId: record.id } });
        return { record, affiliateCode: affiliate.affiliateCode };
      }, { isolationLevel: 'Serializable' });

      if ('error' in payout) {
        const status = payout.error === 'NOT_FOUND' ? 404 : 409;
        return NextResponse.json({ error: { message: payout.error === 'NOT_FOUND' ? 'Không tìm thấy đối tác.' : 'Không có hoa hồng mới cần quyết toán.' } }, { status });
      }
      await writeAuditLog(request, { adminEmail: getRequestSession(request)?.email ?? 'unknown-admin', action: 'PAY_AFFILIATE_COMMISSION', targetEntity: 'AffiliatePayout', targetId: payout.record.id, newValue: { affiliateCode: payout.affiliateCode, amount: payout.record.amount, orderCount: payout.record.orderCount, paymentReference: payout.record.paymentReference } });
      return NextResponse.json({ payout: { id: payout.record.id, amount: payout.record.amount, orderCount: payout.record.orderCount, paidAt: payout.record.paidAt } });
    } catch (error) {
      const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
      if ((error instanceof Error && error.message === 'AFFILIATE_PAYOUT_CONFLICT') || code === 'P2034') {
        return NextResponse.json({ error: { message: 'Hoa hồng vừa được quyết toán ở thao tác khác. Tải lại danh sách rồi thử lại.' } }, { status: 409 });
      }
      throw error;
    }
  });
}