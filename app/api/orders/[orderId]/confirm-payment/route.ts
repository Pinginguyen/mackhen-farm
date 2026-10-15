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

    if (!order || !['VIETQR', 'MOMO'].includes(order.paymentMethod)) {
      return NextResponse.json({ error: { message: 'Không tìm thấy giao dịch thanh toán.' } }, { status: 404 });
    }
    if (!payment && order.paymentMethod === 'MOMO') {
      return NextResponse.json({ confirmed: false, message: 'MoMo chưa gửi IPN xác nhận thanh toán hợp lệ. Đơn vẫn đang chờ thanh toán.' }, { status: 202 });
    }
    if (!payment) return NextResponse.json({ error: { message: 'Không tìm thấy giao dịch thanh toán.' } }, { status: 404 });
    if (order.paymentStatus === 'PAID' && payment.status === 'PAID') {
      return NextResponse.json({ confirmed: true });
    }
    if (Date.now() - payment.createdAt.getTime() > 15 * 60 * 1000) {
      return NextResponse.json({ error: { message: 'Mã QR đã hết hạn. Vui lòng tạo lại đơn thanh toán.' } }, { status: 410 });
    }

    if (order.paymentMethod === 'VIETQR') {
      return NextResponse.json({
        confirmed: false,
        message: 'Chưa nhận được xác nhận chuyển khoản. Trạng thái sẽ cập nhật sau khi PayOS xác minh giao dịch.',
      }, { status: 202 });
    }

    return NextResponse.json({
      confirmed: false,
      message: 'MoMo chưa gửi IPN xác nhận thanh toán hợp lệ. Đơn vẫn đang chờ thanh toán.',
    }, { status: 202 });
  });
}