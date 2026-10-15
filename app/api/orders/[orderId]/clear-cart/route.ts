import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  const orderCode = params.orderId.trim().toUpperCase();
  if (!/^MKF-\d{6}$/.test(orderCode)) return NextResponse.json({ error: { message: 'Mã đơn không hợp lệ.' } }, { status: 400 });

  return withDatabase(async () => {
    const order = await prisma.order.findUnique({ where: { orderCode }, select: { paymentStatus: true } });
    if (!order || order.paymentStatus !== 'PAID') {
      return NextResponse.json({ error: { message: 'Chỉ được xóa giỏ hàng sau khi thanh toán đã xác nhận.' } }, { status: 409 });
    }

    const cartIds = ['bohoch_cart', 'bohoch_buy_now']
      .map((cookieName) => request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))?.[1])
      .filter((value): value is string => Boolean(value))
      .map(decodeURIComponent);
    if (cartIds.length) await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });

    const response = NextResponse.json({ cleared: true });
    for (const cookieName of ['bohoch_cart', 'bohoch_buy_now']) {
      response.cookies.set(cookieName, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
    }
    return response;
  });
}