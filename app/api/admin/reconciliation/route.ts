import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { getCachedPaymentStatus } from '@/lib/payment-status-cache';
import { withDatabase } from '@/lib/api-database';
import { writeAuditLog } from '@/lib/audit-log';
import { notifyPaidOrder } from '@/lib/services/telegram-notifier';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-email-notifications';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  return withDatabase(async () => {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
    const [orders, bankTransfers, todayTransfers, weekTransfers, todayMatched, weekOrderTotals] = await Promise.all([prisma.order.findMany({
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
    }), prisma.bankTransfer.findMany({
      where: { status: { in: ['MISMATCH', 'UNMATCHED'] } },
      include: { order: { select: { orderCode: true, totalAmount: true, customerName: true } } },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    }), prisma.bankTransfer.aggregate({ where: { receivedAt: { gte: todayStart } }, _sum: { amount: true } }),
    prisma.bankTransfer.aggregate({ where: { receivedAt: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.bankTransfer.count({ where: { receivedAt: { gte: todayStart }, status: { in: ['MATCHED', 'MANUALLY_MATCHED'] } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: weekStart }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } })]);

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
          walletAmountSpent: order.walletAmountSpent,
          createdAt: order.createdAt,
          holdExpiresAt: order.holdExpiresAt,
          reconciled: order.reconciled,
          payment: order.payments[0] ?? null,
          hasCachedPaymentEvidence: cachedPayment?.status === 'PAID' && cachedPayment.amount === order.totalAmount - (order.walletAmountSpent ?? 0),
          returnRequest: order.returnRequests[0] ?? null,
        };
      }),
      bankTransfers,
      summary: {
        todayReceived: todayTransfers._sum.amount ?? 0,
        weekReceived: weekTransfers._sum.amount ?? 0,
        todayMatched,
        weekPaidOrders: weekOrderTotals._sum.totalAmount ?? 0,
      },
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
    if (payload.action === 'MATCH_TRANSFER') {
      const bankTransferId = typeof payload.bankTransferId === 'string' ? payload.bankTransferId.trim() : '';
      const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
      if (!bankTransferId || reason.length < 8 || reason.length > 1000) {
        return NextResponse.json({ error: { message: 'Chọn giao dịch và nhập lý do đối soát thủ công (8–1000 ký tự).' } }, { status: 400 });
      }
      const transfer = await prisma.bankTransfer.findUnique({ where: { id: bankTransferId } });
      if (!transfer || !['MISMATCH', 'UNMATCHED'].includes(transfer.status)) {
        return NextResponse.json({ error: { message: 'Giao dịch không còn chờ xử lý.' } }, { status: 409 });
      }
      const matchedOrder = await prisma.order.findUnique({
        where: { orderCode },
        select: { id: true, orderCode: true, numericCode: true, orderStatus: true, paymentStatus: true, reconciled: true, totalAmount: true, walletAmountSpent: true, phone: true, address: true },
      });
      if (!matchedOrder) return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng cần khớp.' } }, { status: 404 });
      if (transfer.amount !== matchedOrder.totalAmount - (matchedOrder.walletAmountSpent ?? 0)) {
        return NextResponse.json({ error: { message: 'Số tiền giao dịch không khớp tổng đơn; không thể xác nhận đơn đã thanh toán.' } }, { status: 409 });
      }
      if (matchedOrder.orderStatus === 'CANCELLED' || matchedOrder.paymentStatus === 'PAID' && matchedOrder.reconciled) {
        return NextResponse.json({ error: { message: 'Đơn đã hủy hoặc đã đối soát; không thể gán giao dịch này.' } }, { status: 409 });
      }

      const matched = await prisma.$transaction(async (transaction) => {
        const claimed = await transaction.bankTransfer.updateMany({
          where: { id: bankTransferId, status: transfer.status, orderId: transfer.orderId },
          data: {
            orderId: matchedOrder.id,
            orderCode: matchedOrder.orderCode,
            status: 'MANUALLY_MATCHED',
            mismatchReason: `Khớp thủ công bởi ${adminEmail}: ${reason}`,
          },
        });
        if (claimed.count !== 1) return false;
        await transaction.order.update({
          where: { id: matchedOrder.id },
          data: {
            paymentStatus: 'PAID',
            orderStatus: ['DELIVERED', 'COMPLETED'].includes(matchedOrder.orderStatus) ? matchedOrder.orderStatus : 'PAID',
            reconciled: true,
            reconciliationStatus: 'MANUALLY_MATCHED',
            reconciliationNote: reason,
            holdExpiresAt: null,
            ...(transfer.transactionId ? { sepayTransactionId: transfer.transactionId } : {}),
          },
        });
        const payment = await transaction.payment.findFirst({ where: { orderId: matchedOrder.id }, orderBy: { createdAt: 'desc' } });
        const paymentData = { status: 'PAID' as const, amount: transfer.amount, externalId: transfer.transactionId ?? transfer.id };
        if (payment) await transaction.payment.update({ where: { id: payment.id }, data: paymentData });
        else await transaction.payment.create({ data: { orderId: matchedOrder.id, orderCode: matchedOrder.numericCode, ...paymentData } });
        return true;
      });
      if (!matched) return NextResponse.json({ error: { message: 'Giao dịch đã được cập nhật bởi một phiên khác.' } }, { status: 409 });

      await writeAuditLog(request, {
        adminEmail,
        action: 'MANUALLY_MATCH_BANK_TRANSFER',
        targetEntity: 'BankTransfer',
        targetId: transfer.transactionId ?? transfer.id,
        oldValue: { status: transfer.status, orderCode: transfer.orderCode, amount: transfer.amount },
        newValue: { status: 'MANUALLY_MATCHED', orderCode, orderAmount: matchedOrder.totalAmount, reason },
      });
      if (matchedOrder.paymentStatus !== 'PAID') {
        await notifyPaidOrder({ orderCode: matchedOrder.orderCode, totalAmount: transfer.amount, phone: matchedOrder.phone, address: matchedOrder.address });
        void sendOrderConfirmationIfNeeded(matchedOrder.id).catch((error) => {
          console.error('Manual reconciliation email failed.', error instanceof Error ? error.name : 'UnknownError');
        });
      }
      return NextResponse.json({ success: true, orderCode, bankTransferId, status: 'MANUALLY_MATCHED' });
    }

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
      const amountDue = order.totalAmount - (order.walletAmountSpent ?? 0);
      const paymentEvidence = order.payments.find((payment) => payment.status === 'PAID' && payment.amount === amountDue)
        ?? (cachedPayment?.status === 'PAID' && cachedPayment.amount === amountDue ? cachedPayment : null);
      if (!paymentEvidence) {
        return NextResponse.json({ error: { code: 'PAYMENT_EVIDENCE_MISSING', message: 'Chưa có webhook hoặc payment record xác thực khớp số tiền. Chưa thể tự chuyển đơn sang đã thanh toán.' } }, { status: 409 });
      }
      if (order.orderStatus === 'CANCELLED') {
        return NextResponse.json({ error: { code: 'CANCELLED_ORDER_PAID', message: 'Đơn đã hủy nhưng có tiền vào. Cần xử lý hoàn tiền có phê duyệt của người quản trị.' } }, { status: 409 });
      }
      if (order.paymentStatus === 'PAID' && order.reconciled) return NextResponse.json({ success: true, alreadyReconciled: true, orderCode });

      await prisma.$transaction(async (transaction) => {
        await transaction.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', orderStatus: 'PAID', reconciled: true, reconciliationStatus: 'MATCHED', reconciliationNote: null, holdExpiresAt: null } });
        if (cachedPayment?.status === 'PAID' && !order.payments.some((payment) => payment.status === 'PAID')) {
          await transaction.payment.upsert({
            where: { orderCode: order.numericCode },
            create: { orderId: order.id, orderCode: order.numericCode, amount: order.totalAmount, status: 'PAID' },
            update: { amount: order.totalAmount, status: 'PAID' },
          });
        }
      });
      await writeAuditLog(request, { adminEmail, action: 'RECONCILE_PAYMENT', targetEntity: 'Order', targetId: orderCode, oldValue: { paymentStatus: order.paymentStatus, reconciled: order.reconciled }, newValue: { paymentStatus: 'PAID', reconciled: true, evidence: 'verified-payment-record-or-webhook-cache' } });
      if (order.paymentStatus !== 'PAID') {
        await notifyPaidOrder({ orderCode: order.orderCode, totalAmount: order.totalAmount, phone: order.phone, address: order.address });
      }
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