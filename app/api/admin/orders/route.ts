import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'HANDED_OFF', 'IN_TRANSIT', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'RETURNED', 'CANCELLED'] as const;
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
    else if (status && ['PROCESSING', 'HANDED_OFF', 'IN_TRANSIT', 'SHIPPING', 'RETURNED', 'CANCELLED'].includes(status)) filters.push({ orderStatus: status as (typeof statuses)[number] });
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
    const body = payload as { orderCode?: unknown; status?: unknown; paymentStatus?: unknown; carrier?: unknown; trackingCode?: unknown; phone?: unknown; address?: unknown; paymentReason?: unknown };
    const orderCode = typeof body.orderCode === 'string' ? body.orderCode.trim().toUpperCase() : '';
    const hasStatus = body.status !== undefined;
    const normalizedPhone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const paymentReason = typeof body.paymentReason === 'string' ? body.paymentReason.trim() : '';
    if (!/^MKF-\d{6}$/.test(orderCode) || (hasStatus && (typeof body.status !== 'string' || !statuses.includes(body.status as (typeof statuses)[number])))
      || (!hasStatus && body.paymentStatus === undefined && body.phone === undefined && body.address === undefined)
      || (body.paymentStatus !== undefined && body.paymentStatus !== 'PENDING' && body.paymentStatus !== 'PAID')
      || (body.carrier !== undefined && body.carrier !== null && typeof body.carrier !== 'string')
      || (body.trackingCode !== undefined && typeof body.trackingCode !== 'string')
      || (typeof body.trackingCode === 'string' && body.trackingCode.length > 160)
      || (body.phone !== undefined && !/^0[35789]\d{8}$/.test(normalizedPhone))
      || (body.address !== undefined && (!address || address.length > 500))
      || (body.paymentReason !== undefined && (typeof body.paymentReason !== 'string' || paymentReason.length > 1000))) {
      return NextResponse.json({ error: { message: 'Mã đơn hoặc trạng thái không hợp lệ.' } }, { status: 400 });
    }
    const requestedStatus = hasStatus ? body.status as (typeof statuses)[number] : undefined;
    if (body.carrier && !carriers.includes(body.carrier as (typeof carriers)[number])) {
      return NextResponse.json({ error: { message: 'Đơn vị vận chuyển không hợp lệ.' } }, { status: 400 });
    }
    let trackingCode = body.trackingCode?.trim() || '';
    if (requestedStatus === 'HANDED_OFF' && body.carrier === 'SPX' && !trackingCode) {
      trackingCode = `SPX${Date.now().toString().slice(-8)}${randomInt(100, 1000)}`;
    }
    return withDatabase(async () => {
      const currentOrder = await prisma.order.findUnique({ where: { orderCode }, select: { orderStatus: true, paymentStatus: true, paymentMethod: true, phone: true, address: true, note: true, carrier: true, trackingCode: true, deliveredAt: true, items: { select: { productId: true, productVariantId: true, quantity: true, lotCode: true } } } });
      if (!currentOrder) return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng.' } }, { status: 404 });
      const targetStatus = requestedStatus ?? currentOrder.orderStatus;
      if (['HANDED_OFF', 'IN_TRANSIT', 'SHIPPING'].includes(targetStatus) && (!(body.carrier || currentOrder.carrier) || !(trackingCode || currentOrder.trackingCode))) {
        return NextResponse.json({ error: { message: 'Nhập hãng vận chuyển và mã vận đơn trước khi bàn giao.' } }, { status: 400 });
      }
      const updatesRecipient = body.phone !== undefined || body.address !== undefined;
      if (updatesRecipient && !['PENDING', 'PROCESSING'].includes(currentOrder.orderStatus)) {
        return NextResponse.json({ error: { message: 'Chỉ được sửa số điện thoại và địa chỉ khi đơn đang chờ xử lý hoặc đóng gói.' } }, { status: 409 });
      }
      const manualPayment = body.paymentStatus === 'PAID' && currentOrder.paymentStatus !== 'PAID' && currentOrder.paymentMethod === 'VIETQR';
      if (manualPayment && !paymentReason) {
        return NextResponse.json({ error: { message: 'Cần nhập lý do để xác nhận thanh toán VietQR thủ công.' } }, { status: 400 });
      }
      if (['CANCELLED', 'RETURNED'].includes(currentOrder.orderStatus) && targetStatus !== currentOrder.orderStatus) {
        return NextResponse.json({ error: { message: 'Đơn đã hủy hoặc chuyển hoàn là trạng thái cuối, không thể tiếp tục xử lý.' } }, { status: 409 });
      }
      if (currentOrder.orderStatus === 'SHIPPING' && !['DELIVERED', 'RETURNED'].includes(targetStatus)) {
        return NextResponse.json({ error: { message: 'Đơn đang giao chỉ có thể cập nhật thành đã giao hoặc chuyển hoàn.' } }, { status: 409 });
      }
      if (['DELIVERED', 'COMPLETED'].includes(targetStatus) && currentOrder.paymentMethod !== 'COD' && currentOrder.paymentStatus !== 'PAID') {
        return NextResponse.json({ error: { message: 'Chưa xác nhận thanh toán VietQR. Hãy cập nhật thanh toán thành Đã thanh toán trước khi hoàn tất đơn.' } }, { status: 409 });
      }
      const wasDelivered = ['DELIVERED', 'COMPLETED'].includes(currentOrder.orderStatus);
      const isDelivered = targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED';
      const order = targetStatus === 'RETURNED'
        ? await prisma.$transaction(async (transaction) => {
          if (currentOrder.orderStatus !== 'RETURNED') {
            for (const item of currentOrder.items) {
              await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
              if (item.productVariantId) await transaction.productVariant.update({ where: { id: item.productVariantId }, data: { stock: { increment: item.quantity } } });
              if (item.lotCode) await transaction.productionLot.updateMany({ where: { lotCode: item.lotCode }, data: { availableQty: { increment: item.quantity } } });
            }
          }
          return transaction.order.update({
            where: { orderCode },
            data: { orderStatus: targetStatus, carrier: null, trackingCode: null, deliveredAt: null },
          });
        })
        : await prisma.order.update({
          where: { orderCode },
          data: {
            orderStatus: targetStatus,
            ...(isDelivered ? { paymentStatus: 'PAID' as const } : body.paymentStatus ? { paymentStatus: body.paymentStatus as 'PENDING' | 'PAID' } : {}),
            ...(body.phone !== undefined ? { phone: normalizedPhone } : {}),
            ...(body.address !== undefined ? { address } : {}),
            ...(manualPayment ? { note: [currentOrder.note?.trim(), `[Thanh toán thủ công bởi ${getRequestSession(request)?.email ?? 'unknown-admin'}]: ${paymentReason}`].filter(Boolean).join('\n') } : {}),
            carrier: body.carrier ? body.carrier as (typeof carriers)[number] : requestedStatus ? null : currentOrder.carrier,
            trackingCode: trackingCode || (body.trackingCode !== undefined ? null : requestedStatus ? null : currentOrder.trackingCode),
            deliveredAt: isDelivered ? (wasDelivered ? currentOrder.deliveredAt ?? new Date() : new Date()) : null,
          },
        });
      const statusChanged = targetStatus !== currentOrder.orderStatus;
      await writeAuditLog(request, {
        adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
        action: statusChanged ? targetStatus === 'CANCELLED' ? 'CANCEL_ORDER' : targetStatus === 'RETURNED' ? 'RETURN_ORDER' : 'UPDATE_ORDER_STATUS' : manualPayment ? 'MANUAL_CONFIRM_PAYMENT' : updatesRecipient ? 'UPDATE_ORDER_RECIPIENT' : 'UPDATE_ORDER',
        targetEntity: 'Order',
        targetId: order.orderCode,
        oldValue: { orderStatus: currentOrder.orderStatus, paymentStatus: currentOrder.paymentStatus, phone: currentOrder.phone, address: currentOrder.address, carrier: currentOrder.carrier, trackingCode: currentOrder.trackingCode, note: currentOrder.note },
        newValue: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, phone: order.phone, address: order.address, carrier: order.carrier, trackingCode: order.trackingCode, note: order.note, paymentReason: manualPayment ? paymentReason : undefined },
      });
      return NextResponse.json({ orderCode: order.orderCode, status: order.orderStatus, paymentStatus: order.paymentStatus, phone: order.phone, address: order.address, carrier: order.carrier, trackingCode: order.trackingCode });
    });
  } catch (error) {
    console.error('Admin order update failed:', error);
    return NextResponse.json({ error: { message: 'Không thể cập nhật đơn hàng.' } }, { status: 500 });
  }
}