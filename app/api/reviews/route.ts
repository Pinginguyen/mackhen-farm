import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { productId?: string; customerName?: string; orderCode?: string; phone?: string; rating?: number; comment?: string };
    const productId = body.productId?.trim();
    const orderCode = body.orderCode?.trim().toUpperCase();
    const phone = body.phone?.trim();
    const customerName = body.customerName?.trim();
    const comment = body.comment?.trim();
    if (!productId || !orderCode || !phone || !Number.isInteger(body.rating) || body.rating! < 1 || body.rating! > 5 || !comment || comment.length < 3 || comment.length > 1000) {
      return NextResponse.json({ error: 'Vui lòng nhập đủ thông tin và chọn số sao từ 1 đến 5.' }, { status: 400 });
    }

    return withDatabase(async () => {
      const order = await prisma.order.findFirst({
        where: { orderCode, phone, orderStatus: 'DELIVERED', items: { some: { productId } } },
        select: { customerName: true },
      });
      if (!order) return NextResponse.json({ error: 'Chỉ đơn đã giao đúng số điện thoại mới được đánh giá sản phẩm.' }, { status: 403 });

      const displayName = customerName && customerName.length > 1 ? customerName : order.customerName;
      const review = await prisma.review.create({ data: { productId, customerName: displayName, rating: body.rating!, comment } });
      const average = await prisma.review.aggregate({ where: { productId }, _avg: { rating: true } });
      await prisma.product.update({ where: { id: productId }, data: { rating: average._avg.rating ?? 0 } });
      return NextResponse.json({ review }, { status: 201 });
    });
  } catch (error) {
    console.error('Review submission failed:', error);
    return NextResponse.json({ error: 'Không thể gửi đánh giá lúc này.' }, { status: 500 });
  }
}