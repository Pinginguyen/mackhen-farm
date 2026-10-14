import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

const warrantyReasons = ['Hở túi', 'Ỉu mốc', 'Đổi khẩu vị'] as const;
const WARRANTY_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  let body: { orderCode?: string; phone?: string; reason?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }

  const orderCode = body.orderCode?.trim().toUpperCase();
  const phone = body.phone?.replace(/\D/g, '');
  if (!orderCode || !phone || !warrantyReasons.includes(body.reason as (typeof warrantyReasons)[number])) {
    return NextResponse.json({ error: 'Vui lòng xác nhận đơn, số điện thoại và lý do bảo hành.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: { warrantyRequest: true } });
    if (!order || order.phone.replace(/\D/g, '') !== phone) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng phù hợp.' }, { status: 404 });
    }
    if (!['DELIVERED', 'COMPLETED'].includes(order.orderStatus)) {
      return NextResponse.json({ error: 'Chỉ có thể yêu cầu sau khi đơn được giao thành công.' }, { status: 409 });
    }
    if (order.warrantyRequest) {
      return NextResponse.json({ request: order.warrantyRequest, alreadyRequested: true });
    }
    const deliveredAt = order.deliveredAt ?? order.updatedAt;
    if (Date.now() - deliveredAt.getTime() > WARRANTY_WINDOW_MS) {
      return NextResponse.json({ error: 'Thời hạn bảo hành vị giác 24 giờ đã kết thúc.' }, { status: 410 });
    }

    try {
      const warrantyRequest = await prisma.warrantyRequest.create({ data: { orderId: order.id, reason: body.reason! } });
      return NextResponse.json({ request: warrantyRequest, message: 'Đã ghi nhận yêu cầu. Xưởng sẽ liên hệ và xử lý trong 24 giờ.' }, { status: 201 });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        const existing = await prisma.warrantyRequest.findUnique({ where: { orderId: order.id } });
        return NextResponse.json({ request: existing, alreadyRequested: true });
      }
      throw error;
    }
  });
}