import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCachedPaymentStatus, rememberPaidPayment } from '@/lib/payment-status-cache';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

type WebhookBody = {
  orderCode?: unknown;
  amount?: unknown;
  sender?: unknown;
  transactionTime?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name.startsWith('PrismaClient')
    || ['P1001', 'P1002', 'P1008', 'P1017'].includes((error as Error & { code?: string }).code ?? '');
}

export async function POST(request: Request) {
  const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'MACKHEN_FARM_SECRET_KEY_2026';
  if (request.headers.get('x-webhook-secret') !== expectedSecret) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  const payload = body as WebhookBody;
  const submittedOrderCode = typeof payload.orderCode === 'string' ? payload.orderCode.trim().toUpperCase() : '';
  const orderCode = /^\d{6}$/.test(submittedOrderCode) ? `MKF-${submittedOrderCode}` : submittedOrderCode;
  const amount = typeof payload.amount === 'number'
    ? payload.amount
    : typeof payload.amount === 'string' && /^\d+$/.test(payload.amount.trim()) ? Number(payload.amount.trim()) : NaN;
  const sender = typeof payload.sender === 'string' ? payload.sender.trim().slice(0, 160) : undefined;
  const transactionTime = typeof payload.transactionTime === 'string' ? payload.transactionTime.trim().slice(0, 80) : undefined;

  if (!/^MKF-\d{6}$/.test(orderCode) || !Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ success: false, message: 'Invalid order code or amount' }, { status: 400 });
  }

  const cached = getCachedPaymentStatus(orderCode);
  if (cached && cached.amount !== amount) {
    return NextResponse.json({ success: false, message: 'Payment amount does not match the order' }, { status: 409 });
  }

  try {
    const numericCode = Number(orderCode.slice(4));
    const order = await prisma.order.findFirst({
      where: { OR: [{ orderCode }, { numericCode }] },
    });
    if (!order && !cached) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }
    let latePaymentOnCancelledOrder = false;
    if (order) {
      if (order.paymentMethod !== 'VIETQR') {
        return NextResponse.json({ success: false, message: 'Order is not a VietQR payment' }, { status: 409 });
      }
      if (order.totalAmount !== amount) {
        return NextResponse.json({ success: false, message: 'Payment amount does not match the order' }, { status: 409 });
      }
      latePaymentOnCancelledOrder = order.orderStatus === 'CANCELLED';

      const transactionNote = [
        'Thanh toán tự động qua MB Bank Email IPN',
        sender ? `Người gửi: ${sender}` : '',
        transactionTime ? `Thời gian: ${transactionTime}` : '',
      ].filter(Boolean).join(' | ');
      await prisma.$transaction(async (transaction) => {
        if (order.paymentStatus !== 'PAID') {
          await transaction.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              orderStatus: latePaymentOnCancelledOrder ? 'CANCELLED' : 'PAID',
              reconciled: !latePaymentOnCancelledOrder,
              holdExpiresAt: null,
              note: order.note?.includes('Thanh toán tự động qua MB Bank Email IPN')
                ? order.note
                : [order.note, transactionNote].filter(Boolean).join('\n'),
            },
          });
        }

        const payment = await transaction.payment.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' } });
        if (payment) {
          if (payment.status !== 'PAID') await transaction.payment.update({ where: { id: payment.id }, data: { status: 'PAID', amount } });
        } else {
          await transaction.payment.create({ data: { orderId: order.id, orderCode: order.numericCode, amount, status: 'PAID' } });
        }
      });
    }

    rememberPaidPayment({ orderCode, amount, sender, transactionTime });
    if (latePaymentOnCancelledOrder) {
      await writeAuditLog(request, {
        adminEmail: 'system:payment-webhook',
        action: 'LATE_PAYMENT_ON_CANCELLED_ORDER',
        targetEntity: 'Order',
        targetId: orderCode,
        newValue: { amount, requiresRefundReview: true },
      });
      return NextResponse.json({ success: true, requiresRefundReview: true, message: `Đã ghi nhận tiền vào cho đơn ${orderCode}; đơn vẫn giữ trạng thái đã hủy và cần Admin xử lý hoàn tiền.` });
    }
    return NextResponse.json({ success: true, message: `Đã xác nhận thanh toán thành công cho đơn ${orderCode}` });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      console.error('MB Bank payment webhook failed:', error instanceof Error ? error.name : 'UnknownError');
      return NextResponse.json({ success: false, message: 'Không thể ghi nhận thanh toán.' }, { status: 500 });
    }

    rememberPaidPayment({ orderCode, amount, sender, transactionTime });
    return NextResponse.json({
      success: true,
      temporary: true,
      message: `Đã ghi nhận tạm thời thanh toán cho đơn ${orderCode}`,
    });
  }
}