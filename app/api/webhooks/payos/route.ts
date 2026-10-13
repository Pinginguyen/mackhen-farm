import { NextResponse } from 'next/server';
import type { Webhook } from '@payos/node';

import { withDatabase } from '@/lib/api-database';
import { getPayOSClient } from '@/lib/payos';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_WEBHOOK', message: 'Webhook không hợp lệ' } }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || !('data' in payload) || !('signature' in payload)) {
    return NextResponse.json({ error: { code: 'INVALID_WEBHOOK', message: 'Webhook không hợp lệ' } }, { status: 400 });
  }

  const payos = getPayOSClient();
  if (!payos) return NextResponse.json({ error: { code: 'PAYMENT_PROVIDER_NOT_CONFIGURED', message: 'Cổng PayOS chưa được cấu hình' } }, { status: 503 });

  let data: Awaited<ReturnType<typeof payos.webhooks.verify>>;
  try {
    data = await payos.webhooks.verify(payload as Webhook);
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Chữ ký webhook không hợp lệ' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const payment = await prisma.payment.findUnique({ where: { orderCode: data.orderCode } });
    if (!payment) return NextResponse.json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Không tìm thấy thanh toán' } }, { status: 404 });
    if (data.amount !== payment.amount) return NextResponse.json({ error: { code: 'AMOUNT_MISMATCH', message: 'Số tiền webhook không khớp' } }, { status: 400 });

    if (data.code === '00') {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', externalId: data.paymentLinkId } }),
        prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID', orderStatus: 'PROCESSING' } }),
      ]);
    }
    return NextResponse.json({ received: true });
  });
}
