import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { getRequestSession } from '@/lib/auth';
import { calculateShipping } from '@/lib/shipping';
import { calculateManagedVoucherDiscount, getManagedVoucherValidationError } from '@/lib/vouchers';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, '');
  const national = compact.replace(/^\+?84/, '0');
  return /^0[35789]\d{8}$/.test(national) ? national : null;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_VOUCHER', message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' } }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.voucherCode !== 'string') {
    return NextResponse.json({ error: { code: 'INVALID_VOUCHER', message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' } }, { status: 400 });
  }

  const code = payload.voucherCode.trim().toUpperCase();
  const isCompensationVoucher = /^MKF50-[A-F0-9]{8}$/.test(code);
  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code) && !isCompensationVoucher) {
    return NextResponse.json({ error: { code: 'INVALID_VOUCHER', message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' } }, { status: 400 });
  }

  const session = getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: { code: 'VOUCHER_LOGIN_REQUIRED', message: 'Vui lòng đăng nhập hoặc tạo tài khoản để sử dụng mã giảm giá này.' } }, { status: 401 });
  }
  const enteredPhone = typeof payload.phone === 'string' ? normalizePhone(payload.phone) : null;
  if (!enteredPhone) {
    return NextResponse.json({ error: { code: 'INVALID_PHONE', message: 'Vui lòng nhập số điện thoại hợp lệ để kiểm tra điều kiện mã giảm giá.' } }, { status: 400 });
  }

  const buyNow = payload.buyNow === true;
  const cookieName = buyNow ? 'bohoch_buy_now' : 'bohoch_cart';
  const cartId = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))?.[1];
  if (!cartId) return NextResponse.json({ error: { code: 'EMPTY_CART', message: 'Giỏ hàng đang trống.' } }, { status: 400 });

  return withDatabase(async () => {
    const voucher = isCompensationVoucher ? null : await prisma.voucher.findUnique({ where: { code } });
    const compensationVoucher = isCompensationVoucher ? await prisma.compensationVoucher.findUnique({ where: { code } }) : null;
    if (!voucher && (!compensationVoucher || compensationVoucher.customerPhone !== enteredPhone || compensationVoucher.redeemedAt || compensationVoucher.expiresAt <= new Date())) {
      return NextResponse.json({ error: { code: 'INVALID_VOUCHER', message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' } }, { status: 400 });
    }
    if (voucher && (!voucher.isActive || (voucher.expiresAt && voucher.expiresAt <= new Date())
      || (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit))) {
      return NextResponse.json({ error: { code: 'INVALID_VOUCHER', message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' } }, { status: 400 });
    }

    if (voucher?.firstOrderOnly) {
      const previousOrders = await prisma.order.count({ where: { userId: session.userId, orderStatus: { not: 'CANCELLED' } } });
      if (previousOrders > 0) {
        return NextResponse.json({ error: { code: 'VOUCHER_FIRST_ORDER_ONLY', message: 'Mã giảm giá này chỉ áp dụng cho đơn hàng đầu tiên của thành viên mới.' } }, { status: 403 });
      }

      const phoneUsed = await prisma.order.findFirst({
        where: {
          phone: enteredPhone,
          orderStatus: { not: 'CANCELLED' },
          OR: [{ paymentStatus: 'PAID' }, { orderStatus: { in: ['DELIVERED', 'COMPLETED'] } }],
        },
        select: { id: true },
      });
      if (phoneUsed) {
        return NextResponse.json({ error: { code: 'VOUCHER_PHONE_USED', message: 'Số điện thoại này đã có đơn hàng thành công và không đủ điều kiện dùng mã thành viên mới.' } }, { status: 403 });
      }
    }

    const cart = await prisma.cart.findUnique({
      where: { id: decodeURIComponent(cartId) },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart?.items.length) return NextResponse.json({ error: { code: 'EMPTY_CART', message: 'Giỏ hàng đang trống.' } }, { status: 400 });

    const subtotal = cart.items.reduce((sum, item) => sum + item.quantity * (item.variant?.price ?? item.product.price), 0);
    const shipping = calculateShipping(subtotal, cart.items.map((item) => item.product.slug));
    if (voucher) {
      const validationError = getManagedVoucherValidationError(voucher, subtotal);
      if (validationError) return NextResponse.json({ error: { code: 'INVALID_VOUCHER', message: validationError } }, { status: 400 });
    }

    const discount = voucher
      ? calculateManagedVoucherDiscount(voucher, subtotal, shipping)
      : Math.floor(subtotal * compensationVoucher!.discountPercent / 100);
    return NextResponse.json({ code, discount, subtotal, shipping });
  });
}