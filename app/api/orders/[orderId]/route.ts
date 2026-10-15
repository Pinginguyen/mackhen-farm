import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCachedPaymentStatus } from '@/lib/payment-status-cache';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { orderId: string } }) {
  const orderCode = params.orderId.trim().toUpperCase();
  const cachedStatus = getCachedPaymentStatus(orderCode);
  try {
    const numericCodeMatch = orderCode.match(/^MKF-(\d{6})$/);
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderCode },
          { id: params.orderId },
          ...(numericCodeMatch ? [{ numericCode: Number(numericCodeMatch[1]) }] : []),
        ],
      },
      select: { orderCode: true, paymentStatus: true, orderStatus: true, totalAmount: true },
    });
    if (order) {
      const paid = order.paymentStatus === 'PAID' || order.orderStatus === 'PAID';
      if (cachedStatus?.status === 'PAID') return NextResponse.json({ orderCode: order.orderCode, status: 'PAID', paymentStatus: 'PAID' });
      return NextResponse.json({ orderCode: order.orderCode, status: paid ? 'PAID' : order.orderStatus, paymentStatus: order.paymentStatus });
    }
    if (cachedStatus) return NextResponse.json({ orderCode, status: cachedStatus.status, paymentStatus: cachedStatus.status, temporary: true });
    return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng.' } }, { status: 404 });
  } catch (error) {
    if (cachedStatus) return NextResponse.json({ orderCode, status: cachedStatus.status, paymentStatus: cachedStatus.status, temporary: true });
    const unavailable = error instanceof Error && (error.name.startsWith('PrismaClient') || ['P1001', 'P1002', 'P1008', 'P1017'].includes((error as Error & { code?: string }).code ?? ''));
    return NextResponse.json({ error: { message: unavailable ? 'Trạng thái đơn hàng chưa khả dụng.' : 'Không thể tải trạng thái đơn hàng.' } }, { status: unavailable ? 503 : 500 });
  }
}