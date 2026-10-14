import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export async function POST(_request: Request, { params }: { params: { orderId: string } }) {
  return withDatabase(async () => {
    const order = await prisma.order.findUnique({
      where: { orderCode: params.orderId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const payment = order?.payments[0];

    if (!order || !payment || !['VIETQR', 'MOMO'].includes(order.paymentMethod)) {
      return NextResponse.json({ error: { message: 'Không tìm thấy giao dịch thanh toán.' } }, { status: 404 });
    }
    if (order.paymentStatus === 'PAID' || ['PAID', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(order.orderStatus)) {
      return NextResponse.json({ confirmed: true });
    }
    if (Date.now() - payment.createdAt.getTime() > 15 * 60 * 1000) {
      return NextResponse.json({ error: { message: 'Mã QR đã hết hạn. Vui lòng tạo lại đơn thanh toán.' } }, { status: 410 });
    }
    if (!['PENDING', 'FAILED'].includes(payment.status) || order.orderStatus !== 'PENDING') {
      return NextResponse.json({ error: { message: 'Đơn hàng không thể xác nhận ở trạng thái hiện tại.' } }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } }),
      prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', orderStatus: 'PROCESSING' } }),
    ]);
    return NextResponse.json({ confirmed: true });
  });
}