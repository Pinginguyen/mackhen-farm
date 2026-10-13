import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';

export const dynamic = 'force-dynamic';

const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'] as const;

export async function GET(request: Request) {
  return withDatabase(async () => {
    const orders = await prisma.order.findMany({
      include: { items: { select: { productName: true, productId: true, variantLabel: true, quantity: true, price: true, product: { select: { slug: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const items = orders.map((order) => ({ id: order.id, orderCode: order.orderCode, customer: order.customerName, phone: order.phone, address: order.address, status: order.orderStatus, paymentStatus: order.paymentStatus, total: order.totalAmount, trackingCode: order.trackingCode, carrier: order.carrier, createdAt: order.createdAt, items: order.items.map((item) => ({ ...item, sku: item.product.slug })) }));
    if (new URL(request.url).searchParams.get('format') === 'csv') {
      const escape = (value: string | number) => {
        const text = String(value);
        const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const rows = [['Order', 'Customer', 'Phone', 'Address', 'Status', 'Payment', 'Total', 'Carrier', 'Tracking', 'Created'], ...items.map((order) => [order.orderCode, order.customer, order.phone, order.address, order.status, order.paymentStatus, order.total, order.carrier ?? '', order.trackingCode ?? '', order.createdAt.toISOString()])];
      return new NextResponse(`\uFEFF${rows.map((row) => row.map(escape).join(',')).join('\r\n')}`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="mac-khen-orders.csv"' } });
    }
    return NextResponse.json({ items });
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { orderCode?: string; status?: string; carrier?: string; trackingCode?: string };
    const orderCode = body.orderCode?.trim().toUpperCase();
    if (!orderCode || !statuses.includes(body.status as (typeof statuses)[number])) {
      return NextResponse.json({ error: { message: 'Mã đơn hoặc trạng thái không hợp lệ.' } }, { status: 400 });
    }
    if (body.carrier && !['GHTK', 'SPX'].includes(body.carrier)) {
      return NextResponse.json({ error: { message: 'Đơn vị vận chuyển không hợp lệ.' } }, { status: 400 });
    }
    if (body.status === 'SHIPPING' && (!body.carrier || !body.trackingCode?.trim())) {
      return NextResponse.json({ error: { message: 'Nhập hãng vận chuyển và mã vận đơn trước khi bàn giao.' } }, { status: 400 });
    }
    return withDatabase(async () => {
      const order = await prisma.order.update({
        where: { orderCode },
        data: { orderStatus: body.status as (typeof statuses)[number], carrier: body.carrier ? body.carrier as 'GHTK' | 'SPX' : null, trackingCode: body.trackingCode?.trim() || null },
      });
      return NextResponse.json({ orderCode: order.orderCode, status: order.orderStatus });
    });
  } catch (error) {
    console.error('Admin order update failed:', error);
    return NextResponse.json({ error: { message: 'Không thể cập nhật đơn hàng.' } }, { status: 500 });
  }
}