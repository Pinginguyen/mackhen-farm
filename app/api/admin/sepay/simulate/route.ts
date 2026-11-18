import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu yêu cầu không hợp lệ.' } }, { status: 400 });
  }
  const orderCode = isRecord(body) && typeof body.orderCode === 'string' ? body.orderCode.trim().toUpperCase() : '';
  if (!/^MKF-\d{6}$/.test(orderCode)) {
    return NextResponse.json({ error: { message: 'Mã đơn hàng không hợp lệ.' } }, { status: 400 });
  }

  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: { message: 'Mô phỏng thanh toán chỉ khả dụng khi webhook chưa được cấu hình ở môi trường nội bộ.' } }, { status: 403 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderCode },
      select: { id: true, numericCode: true, orderCode: true, totalAmount: true, paymentMethod: true, paymentStatus: true, orderStatus: true },
    });
    if (!order) return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng.' } }, { status: 404 });
    if (order.paymentMethod !== 'VIETQR' || order.paymentStatus !== 'PENDING' || !['PENDING', 'CONFIRMED'].includes(order.orderStatus)) {
      return NextResponse.json({ error: { message: 'Chỉ có thể giả lập đơn VietQR chưa thanh toán.' } }, { status: 409 });
    }

    if (!secret) {
      const simulated = await prisma.$transaction(async (transaction) => {
        const claimed = await transaction.order.updateMany({
          where: { id: order.id, paymentMethod: 'VIETQR', paymentStatus: 'PENDING', orderStatus: { in: ['PENDING', 'CONFIRMED'] } },
          data: { paymentStatus: 'PAID', orderStatus: 'PAID', holdExpiresAt: null, reconciled: false, reconciliationStatus: 'PENDING', reconciliationNote: 'Admin-only payment simulation; not verified against a bank transfer.' },
        });
        if (claimed.count !== 1) return false;

        const payment = await transaction.payment.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' } });
        if (payment) {
          await transaction.payment.update({ where: { id: payment.id }, data: { status: 'PAID', amount: order.totalAmount } });
        } else {
          await transaction.payment.create({
            data: { orderId: order.id, orderCode: order.numericCode, amount: order.totalAmount, status: 'PAID' },
          });
        }
        return true;
      });
      if (!simulated) return NextResponse.json({ error: { message: 'Đơn hàng vừa thay đổi trạng thái; hãy tải lại và thử lại.' } }, { status: 409 });
      return NextResponse.json({ success: true, paymentStatus: 'PAID', status: 'PAID', simulated: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL)
      : process.env.VERCEL_URL
        ? new URL(`https://${process.env.VERCEL_URL}`)
        : new URL(request.url);
    const webhookResponse = await fetch(new URL('/api/payment/sepay/webhook', appUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Apikey ${secret}` },
      body: JSON.stringify({
        gateway: 'MBBank',
        subAccount: '0762793244',
        content: order.orderCode,
        transferAmount: order.totalAmount,
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!webhookResponse.ok) {
      return NextResponse.json({ error: { message: 'Webhook SePay từ chối yêu cầu giả lập.' } }, { status: 502 });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { orderCode },
      select: { paymentStatus: true, orderStatus: true },
    });
    if (updatedOrder?.paymentStatus !== 'PAID') {
      return NextResponse.json({ error: { message: 'Webhook chưa xác nhận thanh toán cho đơn hàng.' } }, { status: 502 });
    }

    return NextResponse.json({ success: true, paymentStatus: updatedOrder.paymentStatus, status: updatedOrder.orderStatus });
  } catch {
    return NextResponse.json({ error: { message: 'Không thể giả lập webhook SePay lúc này.' } }, { status: 502 });
  }
}