import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { calculateShipping } from '@/lib/shipping';
import { calculateVoucherDiscount } from '@/lib/vouchers';
import { writeAuditLog } from '@/lib/audit-log';

type CheckoutItemSnapshot = {
  id?: string;
  productId?: string;
  productSlug?: string;
  variantId?: string | null;
  quantity: number;
  price?: number;
};

type CheckoutBody = {
  customerName?: string;
  phone?: string;
  address?: string;
  discountCode?: string;
  customer?: { name?: string; email?: string; phone?: string };
  delivery?: { address?: string };
  paymentMethod?: string;
  note?: string;
  voucherCode?: string;
  buyNow?: boolean;
  items?: unknown;
  price?: unknown;
  totalAmount?: unknown;
  idempotencyKey?: unknown;
};

type CreatedOrder = {
  id: string;
  orderCode: string;
  numericCode: number;
  orderStatus: string;
  totalAmount: number;
  duplicate?: boolean;
};
type CheckoutRejection = { rejected: 'PRICE_MISMATCH' | 'INVALID_VOUCHER' };

function normalizeVietnamesePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, '');
  const national = compact.replace(/^\+?84/, '0');
  return /^0[35789]\d{8}$/.test(national) ? national : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCheckoutItemSnapshot(value: unknown): value is CheckoutItemSnapshot {
  if (!isRecord(value) || !Number.isSafeInteger(value.quantity) || Number(value.quantity) < 1) return false;
  if (typeof value.id === 'string' && value.id.length > 0) return true;
  return typeof value.productId === 'string'
    && typeof value.productSlug === 'string'
    && (typeof value.variantId === 'string' || value.variantId === null);
}

function sameCartContents(
  submitted: unknown,
  current: Array<{ id: string; productId: string; productSlug: string; variantId: string | null; quantity: number; price: number }>,
): boolean {
  if (submitted === undefined) return true;
  if (!Array.isArray(submitted) || submitted.length !== current.length || !submitted.every(isCheckoutItemSnapshot)) return false;
  const matchedIds = new Set<string>();

  return submitted.every((item) => {
    const matched = typeof item.id === 'string'
      ? current.find((currentItem) => currentItem.id === item.id)
      : current.find((currentItem) => currentItem.productId === item.productId && currentItem.variantId === item.variantId);
    if (!matched || matched.quantity !== item.quantity || (item.price !== undefined && item.price !== matched.price) || matchedIds.has(matched.id)) return false;
    matchedIds.add(matched.id);
    return true;
  });
}

function buildPaymentRedirect(method: 'COD' | 'VIETQR' | 'MOMO', orderCode: string, amount: number): string {
  if (method === 'COD') return `/tra-cuu?orderCode=${encodeURIComponent(orderCode)}&success=1`;
  if (method === 'MOMO') return `/checkout/momo/${encodeURIComponent(orderCode)}?amount=${amount}`;
  return `/checkout/vietqr/${encodeURIComponent(orderCode)}?amount=${amount}`;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_ORDER', message: 'Yêu cầu không hợp lệ.' } }, { status: 400 });
  }
  if (!isRecord(payload)) return NextResponse.json({ error: { code: 'INVALID_ORDER', message: 'Yêu cầu không hợp lệ.' } }, { status: 400 });
  const body = payload as CheckoutBody;
  const submittedIdempotencyKey = request.headers.get('idempotency-key')
    ?? (typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '');
  const idempotencyKey = submittedIdempotencyKey.trim();
  if (idempotencyKey && (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey))) {
    return NextResponse.json({ error: { code: 'INVALID_IDEMPOTENCY_KEY', message: 'Mã yêu cầu đặt hàng không hợp lệ.' } }, { status: 400 });
  }

  const submittedName = body.customer?.name ?? body.customerName;
  const submittedPhone = body.customer?.phone ?? body.phone;
  const submittedAddress = body.delivery?.address ?? body.address;
  const name = typeof submittedName === 'string' ? submittedName.trim() : '';
  const phoneInput = typeof submittedPhone === 'string' ? submittedPhone.trim() : '';
  const phone = phoneInput ? normalizeVietnamesePhone(phoneInput) : null;
  const address = typeof submittedAddress === 'string' ? submittedAddress.trim() : '';
  const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.toUpperCase() : '';
  if (!name || name.length > 120 || !phone || !address || address.length > 500 || !['COD', 'VIETQR', 'MOMO'].includes(paymentMethod ?? '')) {
    return NextResponse.json({ error: { code: 'INVALID_ORDER', message: 'Vui lòng nhập họ tên, số điện thoại Việt Nam hợp lệ, địa chỉ và phương thức thanh toán.' } }, { status: 400 });
  }
  const submittedVoucherCode = body.voucherCode ?? body.discountCode;
  const voucherCode = typeof submittedVoucherCode === 'string' ? submittedVoucherCode.trim().toUpperCase() : '';
  if (calculateVoucherDiscount(voucherCode, 0, 0) === null && !/^MKF50-[A-F0-9]{8}$/.test(voucherCode)) {
    return NextResponse.json({ error: { code: 'INVALID_VOUCHER', message: 'Mã giảm giá không hợp lệ.' } }, { status: 400 });
  }
  const cartCookieName = body.buyNow === true ? 'bohoch_buy_now' : 'bohoch_cart';
  const cartId = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${cartCookieName}=([^;]+)`))?.[1];
  if (!cartId) return NextResponse.json({ error: { code: 'EMPTY_CART', message: 'Giỏ hàng đang trống.' } }, { status: 400 });
  const sessionToken = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  const session = verifySessionToken(sessionToken ? decodeURIComponent(sessionToken) : undefined);

  return withDatabase(async () => {
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey },
        select: { id: true, orderCode: true, numericCode: true, orderStatus: true, totalAmount: true, paymentMethod: true },
      });
      if (existingOrder) {
        return NextResponse.json({
          success: true,
          orderId: existingOrder.id,
          orderCode: existingOrder.orderCode,
          numericCode: existingOrder.numericCode,
          status: existingOrder.orderStatus.toLowerCase(),
          total: existingOrder.totalAmount,
          duplicate: true,
          redirectUrl: buildPaymentRedirect(existingOrder.paymentMethod, existingOrder.orderCode, existingOrder.totalAmount),
        });
      }
    }

    let order: CreatedOrder | null | CheckoutRejection;
    try {
      order = await prisma.$transaction(async (transaction) => {
        const cart = await transaction.cart.findUnique({
          where: { id: decodeURIComponent(cartId) },
          include: { items: { include: { product: true, variant: true } } },
        });
        if (!cart?.items.length) return null;

        const currentItems = cart.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productSlug: item.product.slug,
          variantId: item.productVariantId,
          quantity: item.quantity,
          price: item.variant?.price ?? item.product.price,
        }));
        const subtotal = currentItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
        const shipping = calculateShipping(subtotal, currentItems.map((item) => item.productSlug));
        const staticDiscount = calculateVoucherDiscount(voucherCode, subtotal, shipping);
        let compensationVoucherId: string | null = null;
        let discount = staticDiscount ?? 0;
        if (staticDiscount === null) {
          const voucher = await transaction.compensationVoucher.findUnique({ where: { code: voucherCode } });
          if (!voucher || voucher.customerPhone !== phone || voucher.redeemedAt || voucher.expiresAt <= new Date()) {
            return { rejected: 'INVALID_VOUCHER' as const };
          }
          compensationVoucherId = voucher.id;
          discount = Math.floor(subtotal * voucher.discountPercent / 100);
        }
        const totalAmount = subtotal + shipping - discount;

        if (!sameCartContents(body.items, currentItems)) {
          console.warn('Checkout quantity or cart state mismatch rejected.');
          return { rejected: 'PRICE_MISMATCH' as const };
        }

        const recentOrders = await transaction.order.findMany({
          where: { phone, createdAt: { gte: new Date(Date.now() - 3_000) } },
          include: { items: { select: { productId: true, productVariantId: true, quantity: true, price: true } } },
          orderBy: { createdAt: 'desc' },
        });
        const duplicate = recentOrders.find((recentOrder) => {
          if (recentOrder.customerName !== name || recentOrder.address !== address || recentOrder.paymentMethod !== paymentMethod || recentOrder.discountAmount !== discount) return false;
          const previous = recentOrder.items.map((item) => ({
            key: `${item.productId}:${item.productVariantId ?? ''}`,
            quantity: item.quantity,
            price: item.price,
          })).sort((left, right) => left.key.localeCompare(right.key));
          const current = currentItems.map((item) => ({ key: `${item.productId}:${item.variantId ?? ''}`, quantity: item.quantity, price: item.price }))
            .sort((left, right) => left.key.localeCompare(right.key));
          return previous.length === current.length && previous.every((item, index) =>
            item.key === current[index].key && item.quantity === current[index].quantity && item.price === current[index].price);
        });
        if (duplicate) return { ...duplicate, duplicate: true };

        if (compensationVoucherId) {
          const claimedVoucher = await transaction.compensationVoucher.updateMany({
            where: { id: compensationVoucherId, customerPhone: phone, redeemedAt: null, expiresAt: { gt: new Date() } },
            data: { redeemedAt: new Date() },
          });
          if (!claimedVoucher.count) return { rejected: 'INVALID_VOUCHER' as const };
        }

        const reservedLotCodes = new Map<string, string>();
        for (const item of cart.items) {
          const productStock = await transaction.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
          if (!productStock.count) throw new Error(`INSUFFICIENT_STOCK:${item.product.name}`);
          if (item.variant) {
            const variantStock = await transaction.productVariant.updateMany({ where: { id: item.variant.id, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
            if (!variantStock.count) throw new Error(`INSUFFICIENT_STOCK:${item.product.name}`);
          }
          const lot = await transaction.productionLot.findFirst({
            where: { productId: item.productId, status: 'ACTIVE', availableQty: { gte: item.quantity }, expDate: { gt: new Date() } },
            orderBy: [{ expDate: 'asc' }, { mfgDate: 'asc' }],
            select: { id: true, lotCode: true },
          });
          if (!lot) {
            const trackedLot = await transaction.productionLot.findFirst({
              where: { productId: item.productId, status: 'ACTIVE', expDate: { gt: new Date() } },
              select: { id: true },
            });
            if (trackedLot) throw new Error(`INSUFFICIENT_STOCK:${item.product.name}`);
          }
          if (lot) {
            const lotStock = await transaction.productionLot.updateMany({
              where: { id: lot.id, availableQty: { gte: item.quantity } },
              data: { availableQty: { decrement: item.quantity } },
            });
            if (!lotStock.count) throw new Error(`INSUFFICIENT_STOCK:${item.product.name}`);
            reservedLotCodes.set(item.id, lot.lotCode);
          }
        }

        const email = typeof body.customer?.email === 'string' ? body.customer.email.trim().toLowerCase() : '';
        const customer = email
          ? await transaction.customer.upsert({ where: { email }, create: { name, email, phone, address }, update: { name, phone, address } })
          : await transaction.customer.create({ data: { name, phone, address } });
        if (session?.userId) await transaction.user.update({ where: { id: session.userId }, data: { name, phone, address } });
        let numericCode = 0;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const candidate = randomInt(100000, 1000000);
          const existingCode = await transaction.order.findUnique({ where: { numericCode: candidate }, select: { id: true } });
          if (!existingCode) {
            numericCode = candidate;
            break;
          }
        }
        if (!numericCode) throw new Error('ORDER_CODE_GENERATION_FAILED');
        const orderCode = `MKF-${String(numericCode).padStart(6, '0')}`;

        return transaction.order.create({
          data: {
            orderCode,
            numericCode,
            userId: session?.userId,
            customerId: customer.id,
            customerName: name,
            phone,
            address,
            paymentMethod: paymentMethod as 'COD' | 'VIETQR' | 'MOMO',
            paymentStatus: 'PENDING',
            orderStatus: 'PENDING',
            subtotal,
            shippingFee: shipping,
            discountAmount: discount,
            totalAmount,
            idempotencyKey: idempotencyKey || undefined,
            grossAmount: subtotal,
            netAmount: totalAmount,
            reconciled: false,
            holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
            lotCode: [...reservedLotCodes.values()][0] ?? null,
            note: typeof body.note === 'string' ? body.note.trim() || null : null,
            items: { create: cart.items.map((item) => {
              const price = item.variant?.price ?? item.product.price;
              return { productId: item.productId, productVariantId: item.productVariantId, productName: item.product.name, variantLabel: item.variant?.label, quantity: item.quantity, price, lineTotal: item.quantity * price, lotCode: reservedLotCodes.get(item.id) };
            }) },
          },
        });
      }, { isolationLevel: 'Serializable', timeout: 8_000 });
    } catch (error) {
      const prismaErrorCode = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
      if (idempotencyKey && ['P2002', 'P2034'].includes(prismaErrorCode ?? '')) {
        const existingOrder = await prisma.order.findUnique({
          where: { idempotencyKey },
          select: { id: true, orderCode: true, numericCode: true, orderStatus: true, totalAmount: true, paymentMethod: true },
        });
        if (existingOrder) {
          return NextResponse.json({
            success: true,
            orderId: existingOrder.id,
            orderCode: existingOrder.orderCode,
            numericCode: existingOrder.numericCode,
            status: existingOrder.orderStatus.toLowerCase(),
            total: existingOrder.totalAmount,
            duplicate: true,
            redirectUrl: buildPaymentRedirect(existingOrder.paymentMethod, existingOrder.orderCode, existingOrder.totalAmount),
          });
        }
      }
      if (prismaErrorCode === 'P2034') {
        return NextResponse.json({ error: { code: 'CHECKOUT_CONCURRENT_REQUEST', message: 'Yêu cầu đặt hàng đang được xử lý đồng thời. Vui lòng thử lại.' } }, { status: 409 });
      }
      if (error instanceof Error && error.message.startsWith('INSUFFICIENT_STOCK:')) {
        const productName = error.message.slice('INSUFFICIENT_STOCK:'.length);
        return NextResponse.json({ error: { code: 'INSUFFICIENT_STOCK', message: `Sản phẩm ${productName} hiện không đủ số lượng trong kho.` } }, { status: 409 });
      }
      const databaseUnavailable = error instanceof Error && (
        error.name.startsWith('PrismaClient')
        || ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes((error as Error & { code?: string }).code ?? '')
      );
      if (!databaseUnavailable) throw error;

      const prismaCode = (error as Error & { code?: string }).code;
      const schemaMismatch = prismaCode === 'P2021' || prismaCode === 'P2022';
      const transactionExpired = prismaCode === 'P2028';
      console.error('Checkout persistence failed; no unverified order was created.', {
        name: error.name,
        code: prismaCode,
        message: error.message,
      });
      return NextResponse.json({
        error: {
          code: schemaMismatch ? 'DATABASE_SCHEMA_OUT_OF_DATE' : transactionExpired ? 'CHECKOUT_TRANSACTION_TIMEOUT' : 'CHECKOUT_TEMPORARILY_UNAVAILABLE',
          message: schemaMismatch
            ? 'Cơ sở dữ liệu cần được cập nhật migration trước khi nhận đơn.'
            : transactionExpired
              ? 'Giao dịch ghi nhận đơn vượt quá thời gian xử lý. Vui lòng thử lại; hệ thống sẽ kiểm tra theo cùng mã yêu cầu để tránh tạo trùng.'
              : 'Kết nối đặt hàng đang gián đoạn. Vui lòng thử lại; giỏ hàng vẫn được giữ.',
        },
      }, { status: 503, headers: { 'retry-after': '30' } });
    }

    if (order && 'rejected' in order) {
      if (order.rejected === 'PRICE_MISMATCH') {
        await writeAuditLog(request, {
          adminEmail: 'system:checkout',
          action: 'REJECT_PRICE_MISMATCH',
          targetEntity: 'Order',
          targetId: idempotencyKey || `checkout-${Date.now()}`,
          newValue: { reason: 'submitted cart state or line price differs from server data' },
        });
      }
      const invalidVoucher = order.rejected === 'INVALID_VOUCHER';
      return NextResponse.json({
        error: {
          code: order.rejected,
          message: invalidVoucher
            ? 'Mã voucher bồi thường đã hết hạn, đã sử dụng hoặc không thuộc số điện thoại đặt hàng.'
            : 'Giỏ hàng hoặc số lượng đã thay đổi. Vui lòng kiểm tra lại giỏ hàng rồi thử lại.',
        },
      }, { status: invalidVoucher ? 400 : 409 });
    }
    if (!order) return NextResponse.json({ error: { code: 'EMPTY_CART', message: 'Giỏ hàng đang trống.' } }, { status: 400 });
    try {
      await prisma.cartItem.deleteMany({ where: { cartId: decodeURIComponent(cartId) } });
    } catch (error) {
      console.error('Order was created but cart cleanup failed.', error instanceof Error ? error.name : 'UnknownError');
    }
    const response = NextResponse.json({
      success: true,
      orderId: order.id,
      orderCode: order.orderCode,
      numericCode: order.numericCode,
      status: order.orderStatus.toLowerCase(),
      total: order.totalAmount,
      redirectUrl: buildPaymentRedirect(paymentMethod as 'COD' | 'VIETQR' | 'MOMO', order.orderCode, order.totalAmount),
      ...(order.duplicate ? { duplicate: true } : {}),
    }, { status: order.duplicate ? 200 : 201 });
    if (body.buyNow === true) response.cookies.set('bohoch_buy_now', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  }, 'Lỗi đặt hàng:');
}

