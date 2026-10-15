import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SepayPayload = {
  content?: unknown;
  description?: unknown;
  transferAmount?: unknown;
  referenceCode?: unknown;
};

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
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ success: true });

    const payload = body as SepayPayload;
    const orderCode = getOrderCode(payload);
    const transferAmount = getTransferAmount(payload.transferAmount);
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
    if (!order || order.paymentMethod !== 'VIETQR' || transferAmount < order.totalAmount) {
      return NextResponse.json({ success: true });
    }

    await prisma.$transaction(async (transaction) => {
      if (order.paymentStatus !== 'PAID') {
        await transaction.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            orderStatus: ['CANCELLED', 'DELIVERED'].includes(order.orderStatus) ? order.orderStatus : 'PAID',
            holdExpiresAt: null,
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
    console.error('SePay payment webhook failed:', error instanceof Error ? error.name : 'UnknownError');
  }

  return NextResponse.json({ success: true });
}