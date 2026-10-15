import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'HANDED_OFF', 'IN_TRANSIT', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as const;
const carriers = ['GHTK', 'SPX', 'VIETTEL_POST'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return withDatabase(async () => {
    const params = new URL(request.url).searchParams;
    const where: Prisma.OrderWhereInput = {};
    const filters: Prisma.OrderWhereInput[] = [];
    const search = params.get('q')?.trim() ?? params.get('search')?.trim();
    const status = params.get('status');
    const paymentMethod = params.get('paymentMethod');
    const from = params.get('from');
    const to = params.get('to');

    if (search) {
      filters.push({ OR: [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ] });
    }
    if (status === 'PENDING') filters.push({ OR: [
      { orderStatus: { in: ['PENDING', 'CONFIRMED'] } },
      { paymentStatus: 'PENDING', orderStatus: { not: 'CANCELLED' } },
    ] });
    else if (status === 'PAID') filters.push({ paymentStatus: 'PAID' });
    else if (status === 'SUCCESS') filters.push({ orderStatus: { in: ['DELIVERED', 'COMPLETED'] } });
    else if (status === 'RETURNS') filters.push({ OR: [
      { warrantyRequest: { is: { status: 'OPEN' } } },
      { returnRequests: { some: { status: 'PENDING' } } },
    ] });
    else if (status && ['PROCESSING', 'HANDED_OFF', 'IN_TRANSIT', 'SHIPPING', 'CANCELLED'].includes(status)) filters.push({ orderStatus: status as (typeof statuses)[number] });
    if (paymentMethod === 'COD' || paymentMethod === 'VIETQR' || paymentMethod === 'MOMO') where.paymentMethod = paymentMethod;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
        ...(to ? { lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) } : {}),
      };
    }
    if (filters.length) where.AND = filters;
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { select: { productName: true, productId: true, variantLabel: true, quantity: true, price: true, product: { select: { slug: true } } } },
        warrantyRequest: { select: { status: true } },
        returnRequests: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const items = orders.map((order) => ({ id: order.id, orderCode: order.orderCode, customer: order.customerName, phone: order.phone, address: order.address, status: order.orderStatus, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, total: order.totalAmount, trackingCode: order.trackingCode, carrier: order.carrier, createdAt: order.createdAt, hasOpenCase: order.warrantyRequest?.status === 'OPEN' || order.returnRequests.some((request) => request.status === 'PENDING'), items: order.items.map((item) => ({ ...item, sku: item.product.slug })) }));
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
    const payload: unknown = await request.json();
    if (!isRecord(payload)) return NextResponse.json({ error: { message: 'Dữ liệu yêu cầu không hợp lệ.' } }, { status: 400 });
    const body = payload as { orderCode?: unknown; status?: unknown; paymentStatus?: unknown; carrier?: unknown; trackingCode?: unknown };
    const orderCode = typeof body.orderCode === 'string' ? body.orderCode.trim().toUpperCase() : '';
    if (!/^MKF-\d{6}$/.test(orderCode) || typeof body.status !== 'string' || !statuses.includes(body.status as (typeof statuses)[number])
      || (body.paymentStatus !== undefined && body.paymentStatus !== 'PENDING' && body.paymentStatus !== 'PAID')
      || (body.carrier !== undefined && body.carrier !== null && typeof body.carrier !== 'string')
      || (body.trackingCode !== undefined && body.trackingCode !== null && typeof body.trackingCode !== 'string')
      || (typeof body.trackingCode === 'string' && body.trackingCode.length > 160)) {
      return NextResponse.json({ error: { message: 'Mã đơn hoặc trạng thái không hợp lệ.' } }, { status: 400 });
    }
    const targetStatus = body.status as (typeof statuses)[number];
    if (body.carrier && !carriers.includes(body.carrier as (typeof carriers)[number])) {
      return NextResponse.json({ error: { message: 'Đơn vị vận chuyển không hợp lệ.' } }, { status: 400 });
    }
    const trackingCode = typeof body.trackingCode === 'string' ? body.trackingCode.trim() : '';
    if (['HANDED_OFF', 'IN_TRANSIT', 'SHIPPING'].includes(targetStatus) && !body.carrier) {
      return NextResponse.json({ error: { message: 'Chọn hãng vận chuyển trước khi cập nhật trạng thái giao hàng.' } }, { status: 400 });
    }
    return withDatabase(async () => {
      const currentOrder = await prisma.order.findUnique({ where: { orderCode }, select: { orderStatus: true, paymentStatus: true, carrier: true, trackingCode: true, deliveredAt: true } });
      if (!currentOrder) return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng.' } }, { status: 404 });
      const wasDelivered = ['DELIVERED', 'COMPLETED'].includes(currentOrder.orderStatus);
      const isDelivered = targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED';
      const paymentStatus = isDelivered ? 'PAID' : body.paymentStatus === 'PAID' || body.paymentStatus === 'PENDING'
        ? body.paymentStatus
        : currentOrder.paymentStatus;
      const order = await prisma.order.update({
        where: { orderCode },
        data: {
          orderStatus: targetStatus,
          paymentStatus,
          carrier: body.carrier ? body.carrier as (typeof carriers)[number] : null,
          trackingCode: trackingCode || null,
          deliveredAt: isDelivered ? (wasDelivered ? currentOrder.deliveredAt ?? new Date() : new Date()) : null,
        },
      });
      await writeAuditLog(request, {
        adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
        action: targetStatus === 'CANCELLED' ? 'CANCEL_ORDER' : 'UPDATE_ORDER_STATUS',
        targetEntity: 'Order',
        targetId: order.orderCode,
        oldValue: currentOrder,
        newValue: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, carrier: order.carrier, trackingCode: order.trackingCode },
      });
      return NextResponse.json({ orderCode: order.orderCode, status: order.orderStatus, paymentStatus: order.paymentStatus, carrier: order.carrier, trackingCode: order.trackingCode });
    });
  } catch (error) {
    console.error('Admin order update failed:', error);
    return NextResponse.json({ error: { message: 'Không thể cập nhật đơn hàng.' } }, { status: 500 });
  }
}