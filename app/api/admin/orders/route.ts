import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';
import type { Prisma } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as const;
const carriers = ['GHTK', 'SPX', 'VIETTEL_POST'] as const;

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return withDatabase(async () => {
    const params = new URL(request.url).searchParams;
    const where: Prisma.OrderWhereInput = {};
    const search = params.get('q')?.trim() ?? params.get('search')?.trim();
    const status = params.get('status');
    const paymentMethod = params.get('paymentMethod');
    const from = params.get('from');
    const to = params.get('to');

    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    if (status === 'PENDING') where.orderStatus = { in: ['PENDING', 'CONFIRMED'] };
    else if (status === 'SUCCESS') where.orderStatus = { in: ['DELIVERED', 'COMPLETED'] };
    else if (status && ['PROCESSING', 'SHIPPING', 'CANCELLED'].includes(status)) where.orderStatus = status as (typeof statuses)[number];
    if (paymentMethod === 'COD' || paymentMethod === 'VIETQR' || paymentMethod === 'MOMO') where.paymentMethod = paymentMethod;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
        ...(to ? { lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) } : {}),
      };
    }
    const orders = await prisma.order.findMany({
      where,
      include: { items: { select: { productName: true, productId: true, variantLabel: true, quantity: true, price: true, product: { select: { slug: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const items = orders.map((order) => ({ id: order.id, orderCode: order.orderCode, customer: order.customerName, phone: order.phone, address: order.address, status: order.orderStatus, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, total: order.totalAmount, trackingCode: order.trackingCode, carrier: order.carrier, createdAt: order.createdAt, items: order.items.map((item) => ({ ...item, sku: item.product.slug })) }));
    if (params.get('format') === 'csv') {
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
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json() as { orderCode?: string; status?: string; carrier?: string; trackingCode?: string };
    const orderCode = body.orderCode?.trim().toUpperCase();
    if (!orderCode || !statuses.includes(body.status as (typeof statuses)[number])) {
      return NextResponse.json({ error: { message: 'Mã đơn hoặc trạng thái không hợp lệ.' } }, { status: 400 });
    }
    if (body.carrier && !carriers.includes(body.carrier as (typeof carriers)[number])) {
      return NextResponse.json({ error: { message: 'Đơn vị vận chuyển không hợp lệ.' } }, { status: 400 });
    }
    if (body.status === 'SHIPPING' && (!body.carrier || !body.trackingCode?.trim())) {
      return NextResponse.json({ error: { message: 'Nhập hãng vận chuyển và mã vận đơn trước khi bàn giao.' } }, { status: 400 });
    }
    return withDatabase(async () => {
      const currentOrder = await prisma.order.findUnique({ where: { orderCode }, select: { orderStatus: true, deliveredAt: true } });
      if (!currentOrder) return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng.' } }, { status: 404 });
      const wasDelivered = ['DELIVERED', 'COMPLETED'].includes(currentOrder.orderStatus);
      const isDelivered = body.status === 'DELIVERED' || body.status === 'COMPLETED';
      const order = await prisma.order.update({
        where: { orderCode },
        data: {
          orderStatus: body.status as (typeof statuses)[number],
          carrier: body.carrier ? body.carrier as (typeof carriers)[number] : null,
          trackingCode: body.trackingCode?.trim() || null,
          deliveredAt: isDelivered ? (wasDelivered ? currentOrder.deliveredAt ?? new Date() : new Date()) : null,
        },
      });
      return NextResponse.json({ orderCode: order.orderCode, status: order.orderStatus });
    });
  } catch (error) {
    console.error('Admin order update failed:', error);
    return NextResponse.json({ error: { message: 'Không thể cập nhật đơn hàng.' } }, { status: 500 });
  }
}