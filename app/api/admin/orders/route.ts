import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { randomInt } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { orderMovementKey, recordMovement } from '@/lib/services/inventory-ledger';
import { pushOrderToCarrierShipment } from '@/lib/services/shipping-carrier';
import { awardOrderLoyaltyPoints } from '@/lib/loyalty';
import { awardReferralPoints } from '@/lib/referral';
import { creditOrderCashback } from '@/lib/wallet';
import { sendOrderConfirmationIfNeeded, sendShippingUpdateIfNeeded } from '@/lib/order-email-notifications';
import { notifyPaidOrder } from '@/lib/services/telegram-notifier';
import type { Prisma, ShippingCarrier } from '@prisma/client';
import { allowedTransitions, orderStatuses } from '@/lib/order-workflow';

export const dynamic = 'force-dynamic';

const statuses = orderStatuses;
const carriers = ['GHTK', 'SPX', 'VIETTEL_POST'] as const;
const statusLabels: Record<string, (typeof statuses)[number]> = {
  'Đã xác nhận': 'CONFIRMED',
  'Đã thanh toán': 'PAID',
  'Đang đóng gói phòng sạch': 'PROCESSING',
  'Đang giao hàng': 'SHIPPING',
  'Giao thành công': 'DELIVERED',
  'Hoàn tất': 'COMPLETED',
  'Đã hủy': 'CANCELLED',
  'Hoàn hàng': 'RETURNED',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function runOrderUpdateTransaction<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    Sentry.captureException(error, { tags: { route: '/api/admin/orders', operation: 'order-update' } });
    throw error;
  }
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
    if (paymentMethod === 'COD' || paymentMethod === 'VIETQR' || paymentMethod === 'MOMO' || paymentMethod === 'WALLET') where.paymentMethod = paymentMethod;
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
        items: { select: { titleSnapshot: true, variantNameSnapshot: true, skuSnapshot: true, quantity: true, unitPrice: true, finalPrice: true, discountAllocated: true } },
        warrantyRequest: { select: { status: true } },
        returnRequests: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const items = orders.map((order) => ({ id: order.id, orderCode: order.orderCode, customer: order.customerName, phone: order.phone, address: order.address, status: order.orderStatus, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, total: order.totalAmount, subtotal: order.subtotal, shippingFee: order.shippingFee, discountAmount: order.discountAmount, affiliateCode: order.affiliateCode, note: order.note, trackingCode: order.trackingCode, carrier: order.carrier, shippingStatus: order.shippingStatus, shippingLabelUrl: order.shippingLabelUrl, createdAt: order.createdAt, hasOpenCase: order.warrantyRequest?.status === 'OPEN' || order.returnRequests.some((request) => request.status === 'PENDING'), items: order.items.map((item) => ({ productName: item.titleSnapshot, variantLabel: item.variantNameSnapshot, quantity: item.quantity, price: item.unitPrice, finalPrice: item.finalPrice, discountAllocated: item.discountAllocated, sku: item.skuSnapshot ?? '' })) }));
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
    const body = payload as { orderCode?: unknown; status?: unknown; paymentStatus?: unknown; carrier?: unknown; trackingCode?: unknown; phone?: unknown; address?: unknown; paymentReason?: unknown; cancelReason?: unknown };
    const orderCode = typeof body.orderCode === 'string' ? body.orderCode.trim().toUpperCase() : '';
    const hasStatus = body.status !== undefined;
    const statusValue = typeof body.status === 'string' ? body.status.trim() : '';
    const normalizedStatus = statusLabels[statusValue] ?? statusValue;
    const carrierValue = typeof body.carrier === 'string' ? body.carrier.trim() : body.carrier;
    const normalizedCarrier = typeof carrierValue === 'string' && carrierValue.toUpperCase() === 'SPX EXPRESS' ? 'SPX' : carrierValue;
    const normalizedPhone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const paymentReason = typeof body.paymentReason === 'string' ? body.paymentReason.trim() : '';
    const cancelReason = typeof body.cancelReason === 'string' ? body.cancelReason.trim() : '';
    if (!/^MKF-\d{6}$/.test(orderCode) || (hasStatus && !statuses.includes(normalizedStatus as (typeof statuses)[number]))
      || (!hasStatus && body.paymentStatus === undefined && body.phone === undefined && body.address === undefined && body.carrier === undefined && body.trackingCode === undefined)
      || (body.paymentStatus !== undefined && body.paymentStatus !== 'PENDING' && body.paymentStatus !== 'PAID')
      || (normalizedCarrier !== undefined && normalizedCarrier !== null && typeof normalizedCarrier !== 'string')
      || (body.trackingCode !== undefined && typeof body.trackingCode !== 'string')
      || (typeof body.trackingCode === 'string' && body.trackingCode.length > 160)
      || (body.phone !== undefined && !/^0[35789]\d{8}$/.test(normalizedPhone))
      || (body.address !== undefined && (!address || address.length > 500))
      || (body.paymentReason !== undefined && (typeof body.paymentReason !== 'string' || paymentReason.length > 1000))) {
      return NextResponse.json({ error: { message: 'Mã đơn hoặc trạng thái không hợp lệ.' } }, { status: 400 });
    }
    if (body.cancelReason !== undefined && (typeof body.cancelReason !== 'string' || cancelReason.length > 500)) {
      return NextResponse.json({ error: { message: 'Chọn lý do hủy đơn hợp lệ.' } }, { status: 400 });
    }
    const requestedStatus = hasStatus ? normalizedStatus as (typeof statuses)[number] : undefined;
    if (normalizedCarrier && !carriers.includes(normalizedCarrier as (typeof carriers)[number])) {
      return NextResponse.json({ error: { message: 'Đơn vị vận chuyển không hợp lệ.' } }, { status: 400 });
    }
    let trackingCode = body.trackingCode?.trim() || '';
    if (requestedStatus === 'HANDED_OFF' && normalizedCarrier === 'SPX' && !trackingCode) {
      trackingCode = `SPX${Date.now().toString().slice(-8)}${randomInt(100, 1000)}`;
    }
    return withDatabase(async () => {
      const currentOrder = await prisma.order.findUnique({ where: { orderCode }, select: { id: true, orderCode: true, userId: true, referredByUserId: true, orderStatus: true, paymentStatus: true, paymentMethod: true, totalAmount: true, phone: true, address: true, note: true, carrier: true, trackingCode: true, deliveredAt: true, updatedAt: true, affiliateCode: true, affiliateCommissionStatus: true, affiliateCommissionEligibleAt: true, items: { select: { id: true, productId: true, productVariantId: true, quantity: true, lotId: true, lot: { select: { warehouseId: true } } } } } });
      if (!currentOrder) return NextResponse.json({ error: { message: 'Không tìm thấy đơn hàng.' } }, { status: 404 });
      const targetStatus = requestedStatus ?? currentOrder.orderStatus;
      const nextStatuses: readonly string[] = allowedTransitions[currentOrder.orderStatus];
      if (requestedStatus && requestedStatus !== currentOrder.orderStatus && !nextStatuses.includes(requestedStatus)) {
        return NextResponse.json({ error: { message: 'Chuyển trạng thái không hợp lệ.' } }, { status: 409 });
      }
      if (targetStatus !== currentOrder.orderStatus && ['HANDED_OFF', 'IN_TRANSIT', 'SHIPPING'].includes(targetStatus) && (!(normalizedCarrier || currentOrder.carrier) || !(trackingCode || currentOrder.trackingCode))) {
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
      if (targetStatus === 'CANCELLED' && targetStatus !== currentOrder.orderStatus && !['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING'].includes(currentOrder.orderStatus)) {
        return NextResponse.json({ error: { message: 'Không thể hủy đơn sau khi đã bàn giao vận chuyển.' } }, { status: 409 });
      }
      if (targetStatus === 'CANCELLED' && targetStatus !== currentOrder.orderStatus && !cancelReason) {
        return NextResponse.json({ error: { message: 'Chọn lý do hủy đơn hợp lệ.' } }, { status: 400 });
      }
      if (currentOrder.orderStatus === 'SHIPPING' && targetStatus !== currentOrder.orderStatus && !['DELIVERED', 'RETURNED'].includes(targetStatus)) {
        return NextResponse.json({ error: { message: 'Đơn đang giao chỉ có thể cập nhật thành đã giao hoặc chuyển hoàn.' } }, { status: 409 });
      }
      if (targetStatus !== currentOrder.orderStatus && ['DELIVERED', 'COMPLETED'].includes(targetStatus) && currentOrder.paymentMethod !== 'COD' && currentOrder.paymentStatus !== 'PAID') {
        return NextResponse.json({ error: { message: 'Chưa xác nhận thanh toán VietQR. Hãy cập nhật thanh toán thành Đã thanh toán trước khi hoàn tất đơn.' } }, { status: 409 });
      }
      const wasDelivered = ['DELIVERED', 'COMPLETED'].includes(currentOrder.orderStatus);
      const isDelivered = targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED';
      const deliveryTimestamp = isDelivered ? currentOrder.deliveredAt ?? new Date() : null;
      const affiliateCommissionEligibleAt = deliveryTimestamp
        ? new Date(deliveryTimestamp.getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;
      const statusChanged = targetStatus !== currentOrder.orderStatus;
      const returningInventory = statusChanged && ['RETURNED', 'CANCELLED'].includes(targetStatus);
      const preserveCarrier = targetStatus === 'CANCELLED' && statusChanged;
      const clearCarrier = targetStatus === 'RETURNED' && statusChanged;
      const preserveActiveShipment = ['CONFIRMED', 'PROCESSING'].includes(targetStatus);
      const order = await runOrderUpdateTransaction(() => prisma.$transaction(async (transaction) => {
        const claimed = await transaction.order.updateMany({
          where: {
            orderCode,
            orderStatus: currentOrder.orderStatus,
            ...(currentOrder.updatedAt ? { updatedAt: currentOrder.updatedAt } : {}),
          },
          data: { orderStatus: targetStatus },
        });
        if (claimed.count !== 1) return null;

        if (statusChanged && ['CANCELLED', 'RETURNED'].includes(targetStatus)) {
          const movementType = targetStatus === 'CANCELLED' ? 'RELEASE' : 'RETURN';
          for (const item of currentOrder.items) {
            await recordMovement(transaction, {
              orderId: currentOrder.id,
              productId: item.productId,
              variantId: item.productVariantId,
              lotId: item.lotId,
              warehouseId: item.lot?.warehouseId,
              type: movementType,
              delta: item.quantity,
              idempotencyKey: orderMovementKey(item.id, movementType),
              reference: `${targetStatus} ${orderCode}`,
            });
          }
        }

        if (returningInventory) {
          for (const item of currentOrder.items) {
            await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
            if (item.productVariantId) await transaction.productVariant.update({ where: { id: item.productVariantId }, data: { inventory: { increment: item.quantity } } });
            if (item.lotId) await transaction.productionLot.updateMany({ where: { id: item.lotId }, data: { availableQty: { increment: item.quantity } } });
          }
        }

        const updatedOrder = await transaction.order.update({
          where: { orderCode },
          data: {
            orderStatus: targetStatus,
            ...(isDelivered ? { paymentStatus: 'PAID' as const } : body.paymentStatus ? { paymentStatus: body.paymentStatus as 'PENDING' | 'PAID' } : {}),
            ...(body.phone !== undefined ? { phone: normalizedPhone } : {}),
            ...(body.address !== undefined ? { address } : {}),
            ...(manualPayment ? { note: [currentOrder.note?.trim(), `[Thanh toán thủ công bởi ${getRequestSession(request)?.email ?? 'unknown-admin'}]: ${paymentReason}`].filter(Boolean).join('\n') } : {}),
            carrier: preserveCarrier ? currentOrder.carrier : clearCarrier ? null : normalizedCarrier !== undefined ? (normalizedCarrier || null) as (typeof carriers)[number] | null : statusChanged && !preserveActiveShipment ? null : currentOrder.carrier,
            trackingCode: preserveCarrier ? currentOrder.trackingCode : clearCarrier ? null : trackingCode || (body.trackingCode !== undefined ? null : statusChanged && !preserveActiveShipment ? null : currentOrder.trackingCode),
            deliveredAt: isDelivered ? deliveryTimestamp : null,
            ...(statusChanged && ['CANCELLED', 'RETURNED'].includes(targetStatus) && currentOrder.affiliateCode
              ? { affiliateCommissionStatus: 'CANCELLED' as const }
              : {}),
            ...(isDelivered && currentOrder.affiliateCode && !['CANCELLED', 'PAID'].includes(currentOrder.affiliateCommissionStatus ?? '')
              ? {
                affiliateCommissionStatus: currentOrder.affiliateCommissionStatus ?? 'PENDING',
                affiliateCommissionEligibleAt: currentOrder.affiliateCommissionEligibleAt ?? affiliateCommissionEligibleAt,
              }
              : {}),
          },
        });
        if (isDelivered && !wasDelivered) {
          await awardOrderLoyaltyPoints(transaction, { userId: currentOrder.userId, orderId: currentOrder.id, amountVnd: currentOrder.totalAmount });
          await awardReferralPoints(transaction, { orderId: currentOrder.id, orderCode: currentOrder.orderCode, referrerUserId: currentOrder.referredByUserId });
          await creditOrderCashback(transaction, { userId: currentOrder.userId, orderId: currentOrder.id, orderCode: currentOrder.orderCode, orderAmount: currentOrder.totalAmount });
        }
        return updatedOrder;
      }));
      if (!order) return NextResponse.json({ error: { message: 'Xung đột trạng thái đơn hàng.' } }, { status: 409 });
      let autoShipment: Awaited<ReturnType<typeof pushOrderToCarrierShipment>> | null = null;
      const selectedAutoCarrier = normalizedCarrier ?? currentOrder.carrier ?? undefined;
      const autoCarrierEligible = !selectedAutoCarrier || selectedAutoCarrier === 'GHTK' || selectedAutoCarrier === 'VIETTEL_POST';
      if (order.id && statusChanged && ['CONFIRMED', 'PROCESSING'].includes(targetStatus) && !order.trackingCode && autoCarrierEligible) {
        try {
          autoShipment = await pushOrderToCarrierShipment({ id: order.id }, selectedAutoCarrier as ShippingCarrier | undefined);
        } catch (error) {
          console.error('Order status saved; automatic carrier shipment creation failed.', error instanceof Error ? error.message : 'UnknownError');
          Sentry.captureException(error, { tags: { route: '/api/admin/orders', operation: 'carrier-shipment-create' } });
        }
      }
      if (currentOrder.paymentStatus !== 'PAID' && order.paymentStatus === 'PAID') {
        await notifyPaidOrder({ orderCode: order.orderCode, totalAmount: currentOrder.totalAmount, phone: order.phone, address: order.address });
        void sendOrderConfirmationIfNeeded(order.id).catch((error) => {
          console.error('Paid-order email delivery failed.', error instanceof Error ? error.name : 'UnknownError');
        });
      }
      if (['HANDED_OFF', 'IN_TRANSIT', 'SHIPPING'].includes(targetStatus) && (statusChanged || body.trackingCode !== undefined) && order.trackingCode) {
        void sendShippingUpdateIfNeeded(order.id).catch((error) => {
          console.error('Shipping update email delivery failed.', error instanceof Error ? error.name : 'UnknownError');
        });
      }
      await writeAuditLog(request, {
        adminEmail: getRequestSession(request)?.email ?? 'unknown-admin',
        action: statusChanged ? targetStatus === 'CANCELLED' ? 'CANCEL_ORDER' : targetStatus === 'RETURNED' ? 'RETURN_ORDER' : 'UPDATE_ORDER_STATUS' : manualPayment ? 'MANUAL_CONFIRM_PAYMENT' : updatesRecipient ? 'UPDATE_ORDER_RECIPIENT' : 'UPDATE_ORDER',
        targetEntity: 'Order',
        targetId: order.orderCode,
        oldValue: { orderStatus: currentOrder.orderStatus, paymentStatus: currentOrder.paymentStatus, phone: currentOrder.phone, address: currentOrder.address, carrier: currentOrder.carrier, trackingCode: currentOrder.trackingCode, note: currentOrder.note },
        newValue: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, phone: order.phone, address: order.address, carrier: order.carrier, trackingCode: order.trackingCode, note: order.note, paymentReason: manualPayment ? paymentReason : undefined, cancelReason: targetStatus === 'CANCELLED' ? cancelReason : undefined },
      });
      return NextResponse.json({ orderCode: order.orderCode, status: order.orderStatus, paymentStatus: order.paymentStatus, phone: order.phone, address: order.address, carrier: autoShipment?.carrier ?? order.carrier, trackingCode: autoShipment?.trackingCode ?? order.trackingCode });
    });
  } catch (error) {
    console.error('Admin order update failed:', error);
    Sentry.captureException(error, { tags: { route: '/api/admin/orders', operation: 'order-update' } });
    return NextResponse.json({ error: { message: 'Không thể cập nhật đơn hàng.' } }, { status: 500 });
  }
}