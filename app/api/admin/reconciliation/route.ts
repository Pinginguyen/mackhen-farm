import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { getCachedPaymentStatus } from '@/lib/payment-status-cache';
import { withDatabase } from '@/lib/api-database';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: { in: ['VIETQR', 'MOMO'] },
        createdAt: { lte: cutoff },
        OR: [
          { paymentStatus: 'PENDING', orderStatus: { in: ['PENDING', 'CONFIRMED', 'CANCELLED'] } },
          { paymentStatus: 'PAID', orderStatus: 'CANCELLED', reconciled: false },
        ],
      },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, amount: true, externalId: true, createdAt: true } },
        returnRequests: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, refundBankName: true, refundAccountNumber: true, refundAccountHolder: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return NextResponse.json({
      items: orders.map((order) => {
        const cachedPayment = getCachedPaymentStatus(order.orderCode);
        return {
          id: order.id,
          orderCode: order.orderCode,
          customerName: order.customerName,
          phone: order.phone,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          holdExpiresAt: order.holdExpiresAt,
          reconciled: order.reconciled,
          payment: order.payments[0] ?? null,
          hasCachedPaymentEvidence: cachedPayment?.status === 'PAID' && cachedPayment.amount === order.totalAmount,
          returnRequest: order.returnRequests[0] ?? null,
        };
      }),
      providerLookup: 'not-configured',
      message: 'Đối soát chỉ tự xác nhận bằng webhook/payment record đã xác thực; truy vấn số dư ngân hàng/MoMo trực tiếp chưa được cấu hình.',
    });
  }, 'Admin reconciliation lookup failed');
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu yêu cầu không hợp lệ.' } }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.action !== 'string' || typeof payload.orderCode !== 'string') {
    return NextResponse.json({ error: { message: 'Thiếu hành động hoặc mã đơn hàng.' } }, { status: 400 });
  }
  const orderCode = payload.orderCode.trim().toUpperCase();
  if (!/^MKF-\d{6}$/.test(orderCode)) return NextResponse.json({ error: { message: 'Mã đơn hàng không hợp lệ.' } }, { status: 400 });
  const adminEmail = getRequestSession(request)?.email ?? 'unknown-admin';

  return withDatabase(async () => {
    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        returnRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng.' } }, { status: 404 });

    if (payload.action === 'RECONCILE') {
      const cachedPayment = getCachedPaymentStatus(orderCode);
      const paymentEvidence = order.payments.find((payment) => payment.status === 'PAID' && payment.amount === order.totalAmount)
        ?? (cachedPayment?.status === 'PAID' && cachedPayment.amount === order.totalAmount ? cachedPayment : null);
      if (!paymentEvidence) {
        return NextResponse.json({ error: { code: 'PAYMENT_EVIDENCE_MISSING', message: 'Chưa có webhook hoặc payment record xác thực khớp số tiền. Chưa thể tự chuyển đơn sang đã thanh toán.' } }, { status: 409 });
      }
      if (order.orderStatus === 'CANCELLED') {
        return NextResponse.json({ error: { code: 'CANCELLED_ORDER_PAID', message: 'Đơn đã hủy nhưng có tiền vào. Cần xử lý hoàn tiền có phê duyệt của người quản trị.' } }, { status: 409 });
      }
      if (order.paymentStatus === 'PAID' && order.reconciled) return NextResponse.json({ success: true, alreadyReconciled: true, orderCode });

      await prisma.$transaction(async (transaction) => {
        await transaction.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', orderStatus: 'PAID', reconciled: true, holdExpiresAt: null } });
        if (cachedPayment?.status === 'PAID' && !order.payments.some((payment) => payment.status === 'PAID')) {
          await transaction.payment.upsert({
            where: { orderCode: order.numericCode },
            create: { orderId: order.id, orderCode: order.numericCode, amount: order.totalAmount, status: 'PAID' },
            update: { amount: order.totalAmount, status: 'PAID' },
          });
        }
      });
      await writeAuditLog(request, { adminEmail, action: 'RECONCILE_PAYMENT', targetEntity: 'Order', targetId: orderCode, oldValue: { paymentStatus: order.paymentStatus, reconciled: order.reconciled }, newValue: { paymentStatus: 'PAID', reconciled: true, evidence: 'verified-payment-record-or-webhook-cache' } });
      return NextResponse.json({ success: true, orderCode, paymentStatus: 'PAID', reconciled: true });
    }

    if (payload.action === 'PREPARE_REFUND') {
      const returnRequestId = typeof payload.returnRequestId === 'string' ? payload.returnRequestId.trim() : '';
      const returnRequest = order.returnRequests.find((item) => item.id === returnRequestId);
      if (!returnRequest || returnRequest.status !== 'REFUND_APPROVED' || !returnRequest.refundBankName || !returnRequest.refundAccountNumber || !returnRequest.refundAccountHolder) {
        return NextResponse.json({ error: { message: 'Cần yêu cầu hoàn tiền đã được Admin phê duyệt và đủ thông tin nhận tiền.' } }, { status: 409 });
      }
      const existing = await prisma.refundOperation.findFirst({
        where: { orderId: order.id, returnRequestId, status: { in: ['PENDING_APPROVAL', 'APPROVED', 'SENT', 'COMPLETED'] } },
      });
      if (existing) return NextResponse.json({ operation: existing, duplicate: true }, { status: 200 });

      const reason = 'Hoàn tiền từ Quỹ dự phòng xử lý sự cố đứt gãy kết nối';
      const operation = await prisma.refundOperation.create({
        data: {
          orderId: order.id,
          returnRequestId,
          amount: order.totalAmount,
          bankName: returnRequest.refundBankName,
          accountNumber: returnRequest.refundAccountNumber,
          accountHolder: returnRequest.refundAccountHolder,
          reason,
          status: 'PENDING_APPROVAL',
          requestedBy: adminEmail,
        },
      });
      await writeAuditLog(request, { adminEmail, action: 'CREATE_REFUND_OPERATION', targetEntity: 'Order', targetId: orderCode, newValue: { operationId: operation.id, amount: operation.amount, reason, status: operation.status } });
      return NextResponse.json({ operation, message: 'Đã lập lệnh hoàn tiền chờ phê duyệt; chưa có giao dịch chuyển tiền nào được gửi.' }, { status: 201 });
    }

    return NextResponse.json({ error: { message: 'Hành động không được hỗ trợ.' } }, { status: 400 });
  }, 'Admin reconciliation action failed');
}