import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { notifyPaidOrder } from '@/lib/services/telegram-notifier';
import { sendOrderConfirmationIfNeeded } from '@/lib/order-email-notifications';

export const dynamic = 'force-dynamic';

type SepayPayload = {
  id?: unknown;
  transactionId?: unknown;
  content?: unknown;
  description?: unknown;
  transferAmount?: unknown;
  referenceCode?: unknown;
};

function getTransactionId(payload: SepayPayload): string | null {
  for (const value of [payload.transactionId, payload.id, payload.referenceCode]) {
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 120);
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  }
  return null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { code?: unknown }).code === 'P2002';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getOrderCode(payload: SepayPayload): string | null {
  for (const value of [payload.content, payload.description]) {
    if (typeof value !== 'string') continue;
    const match = value.match(/\bMKF-?(\d+)\b/i);
    if (match) return `MKF-${match[1]}`.toUpperCase();
  }
  return null;
}

function getTransferAmount(value: unknown): number | null {
  const amount = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export async function POST(request: Request) {
  const expected = process.env.SEPAY_WEBHOOK_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Apikey\s+/i, '');
  if (!expected || supplied !== expected) {
    return NextResponse.json({ success: false, message: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ success: true });

    const payload = body as SepayPayload;
    const orderCode = getOrderCode(payload);
    const transferAmount = getTransferAmount(payload.transferAmount);
    const transactionId = getTransactionId(payload);
    const content = [payload.content, payload.description].find((value): value is string => typeof value === 'string')?.slice(0, 1000) ?? '';
    const referenceCode = typeof payload.referenceCode === 'string'
      ? payload.referenceCode.trim().slice(0, 120)
      : '';
    if (transferAmount === null) return NextResponse.json({ success: true });
    const idempotencyKey = transactionId
      ? `sepay:${transactionId}`
      : `sepay:payload:${createHash('sha256').update(JSON.stringify(body)).digest('hex')}`;

    const order = orderCode ? await prisma.order.findUnique({
      where: { orderCode },
      select: {
        id: true,
        orderCode: true,
        numericCode: true,
        totalAmount: true,
        walletAmountSpent: true,
        phone: true,
        address: true,
        paymentMethod: true,
        paymentStatus: true,
        orderStatus: true,
      },
    }) : null;
    const eligibleOrder = order && ['VIETQR', 'MOMO'].includes(order.paymentMethod) ? order : null;
    const amountDue = eligibleOrder ? eligibleOrder.totalAmount - (eligibleOrder.walletAmountSpent ?? 0) : 0;
    const exactMatch = Boolean(eligibleOrder && transferAmount === amountDue);
    const mismatchReason = !orderCode
      ? 'Không tìm thấy mã đơn trong nội dung chuyển khoản.'
      : !order
        ? `Không tìm thấy đơn ${orderCode}.`
        : !eligibleOrder
          ? 'Đơn hàng không sử dụng phương thức thanh toán trực tuyến.'
          : transferAmount < amountDue
            ? `Thiếu ${amountDue - transferAmount}đ so với số tiền còn phải thanh toán.`
            : transferAmount > amountDue
              ? `Thừa ${transferAmount - amountDue}đ so với số tiền còn phải thanh toán.`
              : null;
    const transferStatus = exactMatch ? 'MATCHED' as const : eligibleOrder ? 'MISMATCH' as const : 'UNMATCHED' as const;

    try {
      await prisma.$transaction(async (transaction) => {
        const insertedTransfer = await transaction.bankTransfer.createMany({
          data: [{
            transactionId,
            idempotencyKey,
            orderCode,
            amount: transferAmount,
            content,
            status: transferStatus,
            mismatchReason,
            orderId: eligibleOrder?.id ?? null,
          }],
          skipDuplicates: true,
        });
        if (insertedTransfer.count !== 1 || !eligibleOrder) return;

        if (!exactMatch) {
          await transaction.order.update({
            where: { id: eligibleOrder.id },
            data: { reconciliationStatus: 'MISMATCH', reconciliationNote: mismatchReason, reconciled: false },
          });
          return;
        }

        if (eligibleOrder.paymentStatus !== 'PAID') {
          await transaction.order.update({
            where: { id: eligibleOrder.id },
            data: {
              paymentStatus: 'PAID',
              orderStatus: ['CANCELLED', 'DELIVERED'].includes(eligibleOrder.orderStatus) ? eligibleOrder.orderStatus : 'PAID',
              holdExpiresAt: null,
              sepayTransactionId: transactionId,
              reconciliationStatus: 'MATCHED',
              reconciliationNote: null,
              reconciled: true,
            },
          });
        } else {
          await transaction.order.update({ where: { id: eligibleOrder.id }, data: { reconciliationStatus: 'MATCHED', reconciliationNote: null, reconciled: true } });
        }

        const payment = await transaction.payment.findFirst({
          where: { orderId: eligibleOrder.id },
          orderBy: { createdAt: 'desc' },
        });
        const paymentData = {
          status: 'PAID' as const,
          amount: transferAmount,
          ...(referenceCode || transactionId ? { externalId: referenceCode || transactionId } : {}),
        };
        if (payment) {
          await transaction.payment.update({ where: { id: payment.id }, data: paymentData });
        } else {
          await transaction.payment.create({
            data: {
              orderId: eligibleOrder.id,
              orderCode: eligibleOrder.numericCode,
              ...paymentData,
            },
          });
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return NextResponse.json({ success: true });
      throw error;
    }
    if (exactMatch && eligibleOrder && eligibleOrder.paymentStatus !== 'PAID') {
      await notifyPaidOrder({ orderCode: eligibleOrder.orderCode, totalAmount: eligibleOrder.totalAmount, phone: eligibleOrder.phone, address: eligibleOrder.address });
      void sendOrderConfirmationIfNeeded(eligibleOrder.id).catch((error) => {
        console.error('Payment receipt email delivery failed.', error instanceof Error ? error.name : 'UnknownError');
      });
    }
  } catch (error) {
    console.error('SePay payment webhook failed:', error instanceof Error ? error.name : 'UnknownError');
  }

  return NextResponse.json({ success: true });
}