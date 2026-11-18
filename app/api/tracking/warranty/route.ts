import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { notifyCustomerCase } from '@/lib/services/telegram-notifier';

const warrantyReasons = ['Hở túi', 'Ỉu mốc', 'Đổi khẩu vị'] as const;
const WARRANTY_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  let body: { orderCode?: string; phone?: string; reason?: string; qrToken?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }

  const orderCode = body.orderCode?.trim().toUpperCase();
  const phone = body.phone?.replace(/\D/g, '');
  const qrToken = body.qrToken?.trim() || '';
  if (!orderCode || !phone || !warrantyReasons.includes(body.reason as (typeof warrantyReasons)[number])
    || (qrToken && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(qrToken))) {
    return NextResponse.json({ error: 'Vui lòng xác nhận đơn, số điện thoại và lý do bảo hành.' }, { status: 400 });
  }

  return withDatabase(async () => {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: { warrantyRequest: true, items: { select: { lot: { select: { qrToken: true } } } } } });
    if (!order || order.phone.replace(/\D/g, '') !== phone) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng phù hợp.' }, { status: 404 });
    }
    if (!['DELIVERED', 'COMPLETED'].includes(order.orderStatus)) {
      return NextResponse.json({ error: 'Chỉ có thể yêu cầu sau khi đơn được giao thành công.' }, { status: 409 });
    }
    if (qrToken && !order.items.some((item) => item.lot?.qrToken === qrToken)) {
      return NextResponse.json({ error: 'Mã QR này không thuộc sản phẩm trong đơn hàng đã nhập.' }, { status: 403 });
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
      await notifyCustomerCase({ kind: 'Bảo hành', orderCode: order.orderCode, phone: order.phone, description: body.reason! });
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