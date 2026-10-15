import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

function normalizeVietnamesePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, '');
  const national = compact.replace(/^\+?84/, '0');
  return /^0[35789]\d{8}$/.test(national) ? national : null;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 ? `${digits.slice(0, 4)}.xxx.${digits.slice(-3)}` : '***';
}

function maskAddress(value: string): string {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 ? parts.slice(0, 3).reverse().join(', ') : 'Khu vực chưa cập nhật';
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Thông tin tra cứu không hợp lệ.' }, { status: 400 });
    }
    const values = body as { orderCode?: unknown; phone?: unknown };
    const orderCode = typeof values.orderCode === 'string' ? values.orderCode.trim().toUpperCase() : '';
    const phoneInput = typeof values.phone === 'string' ? values.phone.trim() : '';
    const phone = phoneInput ? normalizeVietnamesePhone(phoneInput) : null;
    if (!orderCode || !phone) return NextResponse.json({ error: 'Nhập mã đơn hàng và số điện thoại hợp lệ để tra cứu.' }, { status: 400 });

    return withDatabase(async () => {
      const order = await prisma.order.findUnique({
        where: { orderCode },
        include: { items: { select: { productId: true, productName: true, quantity: true, price: true } }, warrantyRequest: { select: { reason: true, status: true, createdAt: true } } },
      });
      const items = order && normalizeVietnamesePhone(order.phone) === phone ? [{
        orderCode: order.orderCode,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        trackingCode: order.trackingCode,
        carrier: order.carrier,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        warrantyRequest: order.warrantyRequest,
        items: order.items,
        maskedPhone: maskPhone(order.phone),
        maskedAddress: maskAddress(order.address),
      }] : [];
      return NextResponse.json({ items });
    });
  } catch (error) {
    console.error('Order tracking failed:', error);
    return NextResponse.json({ error: 'Không thể tra cứu đơn hàng lúc này.' }, { status: 500 });
  }
}