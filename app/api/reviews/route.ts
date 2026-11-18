import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { classifyReviewRisk } from '@/lib/sentiment-analysis';

function normalizeVietnamesePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('0084') ? `0${digits.slice(4)}` : digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
  return /^0[35789]\d{8}$/.test(national) ? national : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { productId?: string; customerName?: string; orderCode?: string; phone?: string; rating?: number; comment?: string; images?: unknown };
    const productId = body.productId?.trim();
    const orderCode = body.orderCode?.trim().toUpperCase();
    const phone = body.phone ? normalizeVietnamesePhone(body.phone) : null;
    const customerName = body.customerName?.trim();
    const comment = body.comment?.trim();
    const images = Array.isArray(body.images) && body.images.every((url) => typeof url === 'string' && url.length <= 2048 && /^https:\/\//i.test(url))
      ? [...new Set(body.images as string[])]
      : body.images === undefined ? [] : null;
    if (!productId || !orderCode || !phone || !Number.isInteger(body.rating) || body.rating! < 1 || body.rating! > 5 || !comment || comment.length < 3 || comment.length > 1000) {
      return NextResponse.json({ error: 'Vui lòng nhập đủ thông tin và chọn số sao từ 1 đến 5.' }, { status: 400 });
    }
    if (!images || images.length > 5) return NextResponse.json({ error: 'Danh sách ảnh không hợp lệ hoặc vượt quá 5 ảnh.' }, { status: 400 });

    return withDatabase(async () => {
      const order = await prisma.order.findUnique({
        where: { orderCode },
        select: { id: true, customerName: true, phone: true, orderStatus: true, user: { select: { email: true } }, customer: { select: { email: true } }, items: { select: { productId: true } } },
      });
      if (!order) return NextResponse.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng.' } }, { status: 404 });
      if (normalizeVietnamesePhone(order.phone) !== phone) return NextResponse.json({ error: { code: 'PHONE_MISMATCH', message: 'Số điện thoại không khớp với đơn hàng.' } }, { status: 403 });
      if (!['DELIVERED', 'COMPLETED'].includes(order.orderStatus)) return NextResponse.json({ error: { code: 'ORDER_NOT_COMPLETED', message: 'Chỉ đơn đã giao mới được đánh giá sản phẩm.' } }, { status: 409 });
      if (!order.items.some((item) => item.productId === productId)) return NextResponse.json({ error: { code: 'PRODUCT_NOT_IN_ORDER', message: 'Sản phẩm này không có trong đơn hàng.' } }, { status: 400 });

      const existingReview = await prisma.review.findUnique({ where: { orderId_productId: { orderId: order.id, productId } } });
      if (existingReview) return NextResponse.json({ error: { code: 'DUPLICATE_REVIEW', message: 'Bạn đã đánh giá sản phẩm này trong đơn hàng trước đó.' } }, { status: 409 });

      const displayName = customerName && customerName.length > 1 ? customerName : order.customerName;
      const review = await prisma.review.create({
        data: {
          orderId: order.id,
          productId,
          customerName: displayName,
          rating: body.rating!,
          comment,
          images,
          riskTag: classifyReviewRisk(body.rating!, comment),
          riskAnalyzedAt: new Date(),
        },
      });
      const average = await prisma.review.aggregate({ where: { productId }, _avg: { rating: true } });
      await prisma.product.update({ where: { id: productId }, data: { rating: average._avg.rating ?? 0 } });
      return NextResponse.json({ review }, { status: 201 });
    });
  } catch (error) {
    console.error('Review submission failed:', error);
    return NextResponse.json({ error: 'Không thể gửi đánh giá lúc này.' }, { status: 500 });
  }
}