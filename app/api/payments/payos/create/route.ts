import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { withDatabase } from '@/lib/api-database';
import { getPayOSClient } from '@/lib/payos';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  let body: { orderId?: string; amount?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_PAYMENT', message: 'Yêu cầu không hợp lệ' } }, { status: 400 });
  }

  if (!body.orderId || !Number.isInteger(body.amount) || !body.amount || body.amount < 0) {
    return NextResponse.json({ error: { code: 'INVALID_PAYMENT', message: 'Thiếu thông tin thanh toán' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { customer: true, items: true },
    });
    if (!order) return NextResponse.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' } }, { status: 404 });
    if (order.paymentMethod !== 'VIETQR') return NextResponse.json({ error: { code: 'INVALID_PAYMENT_METHOD', message: 'Đơn hàng không sử dụng VietQR.' } }, { status: 400 });
    if (body.amount !== order.totalAmount) return NextResponse.json({ error: { code: 'AMOUNT_MISMATCH', message: 'Số tiền thanh toán không khớp đơn hàng' } }, { status: 400 });

    const existing = await prisma.payment.findFirst({
      where: { orderId: order.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.checkoutUrl) return NextResponse.json({ checkoutUrl: existing.checkoutUrl, paymentId: existing.externalId });

    const payment = existing ?? await prisma.payment.findUnique({ where: { orderCode: order.numericCode } }) ?? await prisma.payment.create({ data: { orderId: order.id, orderCode: order.numericCode, amount: order.totalAmount } });
    const fallbackUrl = `/checkout/vietqr/${encodeURIComponent(order.orderCode)}`;
    const payos = getPayOSClient();
    if (!payos) return NextResponse.json({ fallbackUrl });

    const requestHeaders = headers();
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000';
    const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
    const baseUrl = process.env.APP_URL ?? `${protocol}://${host}`;

    try {
      const link = await payos.paymentRequests.create({
        orderCode: order.numericCode,
        amount: order.totalAmount,
        description: `MKF ${order.numericCode}`,
        cancelUrl: `${baseUrl}/checkout?payment=cancelled`,
        returnUrl: `${baseUrl}/checkout?payment=success`,
        buyerName: order.customerName,
        buyerEmail: order.customer?.email ?? undefined,
        buyerPhone: order.phone,
        buyerAddress: order.address,
        items: order.items.map((item) => ({ name: `${item.productName}${item.variantLabel ? ` ${item.variantLabel}` : ''}`.slice(0, 50), quantity: item.quantity, price: item.price })),
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { externalId: link.paymentLinkId, checkoutUrl: link.checkoutUrl } });
      return NextResponse.json({ checkoutUrl: link.checkoutUrl, paymentId: link.paymentLinkId });
    } catch {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      return NextResponse.json({ fallbackUrl });
    }
  });
}
