import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { verifyMomoIpnSignature, type MomoIpnPayload } from '@/lib/momo-ipn';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  if (!accessKey || !secretKey || !partnerCode) {
    return NextResponse.json({ resultCode: 1, message: 'MoMo IPN chưa được cấu hình.' }, { status: 503 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ resultCode: 1, message: 'Payload IPN không hợp lệ.' }, { status: 400 });
  }
  if (!isRecord(rawPayload)) return NextResponse.json({ resultCode: 1, message: 'Payload IPN không hợp lệ.' }, { status: 400 });

  const payload = rawPayload as MomoIpnPayload;
  if (payload.accessKey !== accessKey || payload.partnerCode !== partnerCode || !verifyMomoIpnSignature(payload, accessKey, secretKey)) {
    return NextResponse.json({ resultCode: 1, message: 'Chữ ký IPN không hợp lệ.' }, { status: 401 });
  }

  if (payload.resultCode !== 0 && payload.resultCode !== '0') {
    return NextResponse.json({ resultCode: 0, message: 'Đã nhận IPN; giao dịch chưa thành công.' });
  }

  const orderCode = typeof payload.orderId === 'string' ? payload.orderId.trim().toUpperCase() : '';
  const amount = Number(payload.amount);
  const externalId = String(payload.transId ?? '').trim();
  if (!/^MKF-\d{6}$/.test(orderCode) || !Number.isSafeInteger(amount) || amount < 1 || !externalId) {
    return NextResponse.json({ resultCode: 1, message: 'Thông tin giao dịch không hợp lệ.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const order = await prisma.order.findUnique({
      where: { orderCode },
      select: { id: true, orderCode: true, numericCode: true, paymentMethod: true, paymentStatus: true, orderStatus: true, totalAmount: true },
    });
    if (!order || order.paymentMethod !== 'MOMO') {
      return NextResponse.json({ resultCode: 1, message: 'Không tìm thấy đơn MoMo.' }, { status: 404 });
    }
    if (amount !== order.totalAmount) {
      return NextResponse.json({ resultCode: 1, message: 'Số tiền giao dịch không khớp.' }, { status: 400 });
    }
    if (order.paymentStatus === 'PAID') return NextResponse.json({ resultCode: 0, message: 'Giao dịch đã được xác nhận.' });
    if (order.orderStatus !== 'PENDING') {
      return NextResponse.json({ resultCode: 1, message: 'Đơn hàng không còn chờ thanh toán.' }, { status: 409 });
    }

    await prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.findUnique({ where: { orderCode: order.numericCode } });
      if (payment) {
        await transaction.payment.update({ where: { id: payment.id }, data: { status: 'PAID', amount, externalId } });
      } else {
        await transaction.payment.create({ data: { orderId: order.id, orderCode: order.numericCode, amount, externalId, status: 'PAID' } });
      }
      await transaction.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', orderStatus: 'PROCESSING', holdExpiresAt: null } });
    });

    return NextResponse.json({ resultCode: 0, message: 'Giao dịch đã được xác nhận.' });
  }, 'MoMo IPN processing failed');
}