import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { orderCode?: string; phone?: string };
    const orderCode = body.orderCode?.trim().toUpperCase();
    const phone = body.phone?.trim();
    if (!orderCode && !phone) return NextResponse.json({ error: 'Nhập mã đơn hàng hoặc số điện thoại.' }, { status: 400 });

    return withDatabase(async () => {
      const orders = await prisma.order.findMany({
        where: orderCode ? { orderCode } : { phone },
        include: { items: { select: { productId: true, productName: true, quantity: true, price: true } }, warrantyRequest: { select: { reason: true, status: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return NextResponse.json({ items: orders.map((order) => ({
        orderCode: order.orderCode,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        trackingCode: order.trackingCode,
        carrier: order.carrier,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        warrantyRequest: order.warrantyRequest,
        items: order.items,
      })) });
    });
  } catch (error) {
    console.error('Order tracking failed:', error);
    return NextResponse.json({ error: 'Không thể tra cứu đơn hàng lúc này.' }, { status: 500 });
  }
}