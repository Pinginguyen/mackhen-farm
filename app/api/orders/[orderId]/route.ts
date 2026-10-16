import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCachedPaymentStatus } from '@/lib/payment-status-cache';

export const dynamic = 'force-dynamic';

function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('0084') ? `0${digits.slice(4)}` : digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
  return /^0[35789]\d{8}$/.test(national) ? national : null;
}

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  const orderCode = params.orderId.trim().toUpperCase();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Vui lòng cung cấp số điện thoại đặt hàng.' } }, { status: 400 });
  }
  const bodyPhone = typeof body === 'object' && body !== null && !Array.isArray(body) && 'phone' in body && typeof body.phone === 'string'
    ? body.phone
    : undefined;
  const verificationCookie = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)mkf_payment_${orderCode}=([^;]+)`))?.[1];
  const phone = normalizePhone(bodyPhone ?? verificationCookie ?? '');
  if (!/^MKF-\d{6}$/.test(orderCode) || !phone) {
    return NextResponse.json({ error: { message: 'Mã đơn hàng và số điện thoại hợp lệ là bắt buộc.' } }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderCode },
      select: { orderCode: true, phone: true, paymentStatus: true, orderStatus: true },
    });
    if (!order || normalizePhone(order.phone) !== phone) {
      return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng phù hợp.' } }, { status: 404 });
    }
    const cachedStatus = getCachedPaymentStatus(orderCode);
    const paid = order.paymentStatus === 'PAID' || order.orderStatus === 'PAID';
    if (cachedStatus?.status === 'PAID') return NextResponse.json({ orderCode: order.orderCode, status: 'PAID', paymentStatus: 'PAID' });
    return NextResponse.json({ orderCode: order.orderCode, status: paid ? 'PAID' : order.orderStatus, paymentStatus: order.paymentStatus });
  } catch (error) {
    console.error('Order payment status lookup failed:', error instanceof Error ? error.name : 'UnknownError');
    const unavailable = error instanceof Error && (error.name.startsWith('PrismaClient') || ['P1001', 'P1002', 'P1008', 'P1017'].includes((error as Error & { code?: string }).code ?? ''));
    return NextResponse.json({ error: { message: 'Trạng thái đơn hàng tạm thời chưa khả dụng. Vui lòng thử lại.' } }, { status: unavailable ? 503 : 500 });
  }
}