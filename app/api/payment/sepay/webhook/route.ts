import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

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
    const referenceCode = typeof payload.referenceCode === 'string'
      ? payload.referenceCode.trim().slice(0, 120)
      : '';
    if (!orderCode || transferAmount === null) return NextResponse.json({ success: true });

    const order = await prisma.order.findUnique({
      where: { orderCode },
      select: {
        id: true,
        numericCode: true,
        totalAmount: true,
        paymentMethod: true,
        paymentStatus: true,
        orderStatus: true,
      },
    });
    if (!order || !['VIETQR', 'MOMO'].includes(order.paymentMethod) || transferAmount < order.totalAmount) {
      return NextResponse.json({ success: true });
    }

    try {
      await prisma.$transaction(async (transaction) => {
        if (order.paymentStatus !== 'PAID') {
          await transaction.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              orderStatus: ['CANCELLED', 'DELIVERED'].includes(order.orderStatus) ? order.orderStatus : 'PAID',
              holdExpiresAt: null,
              ...(transactionId ? { sepayTransactionId: transactionId } : {}),
            },
          });
        }

        const payment = await transaction.payment.findFirst({
          where: { orderId: order.id },
          orderBy: { createdAt: 'desc' },
        });
        const paymentData = {
          status: 'PAID' as const,
          amount: transferAmount,
          ...(referenceCode ? { externalId: referenceCode } : {}),
        };
        if (payment) {
          await transaction.payment.update({ where: { id: payment.id }, data: paymentData });
        } else {
          await transaction.payment.create({
            data: {
              orderId: order.id,
              orderCode: order.numericCode,
              ...paymentData,
            },
          });
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return NextResponse.json({ success: true });
      throw error;
    }
  } catch (error) {
    console.error('SePay payment webhook failed:', error instanceof Error ? error.name : 'UnknownError');
  }

  return NextResponse.json({ success: true });
}