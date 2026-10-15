import { NextResponse } from 'next/server';

import { getRequestSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = getRequestSession(request);
    if (!session) return NextResponse.json({ error: 'Cần đăng nhập để xem đơn hàng.' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { phone: true } });
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: session.userId },
          ...(user?.phone ? [{ phone: user.phone }] : []),
          { customer: { is: { email: session.email } } },
        ],
      },
      select: { orderCode: true, createdAt: true, totalAmount: true, orderStatus: true, paymentStatus: true, items: { select: { productName: true, quantity: true, price: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ items: orders });
  } catch (error) {
    console.error('Account orders lookup failed:', error);
    return NextResponse.json({ error: 'Không thể tải lịch sử đơn hàng.' }, { status: 500 });
  }
}