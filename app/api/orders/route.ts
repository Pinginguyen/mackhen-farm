import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { calculateShipping } from '@/lib/shipping';
import { calculateVoucherDiscount } from '@/lib/vouchers';

type CheckoutBody = {
  customer?: { name?: string; email?: string; phone?: string };
  delivery?: { address?: string };
  paymentMethod?: string;
  note?: string;
  voucherCode?: string;
};

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = await request.json() as CheckoutBody;
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_ORDER', message: 'Yêu cầu không hợp lệ.' } }, { status: 400 });
  }

  const name = body.customer?.name?.trim();
  const phone = body.customer?.phone?.trim();
  const address = body.delivery?.address?.trim();
  const paymentMethod = body.paymentMethod?.toUpperCase();
  if (!name || !phone || !address || !['COD', 'VIETQR', 'MOMO'].includes(paymentMethod ?? '')) {
    return NextResponse.json({ error: { code: 'INVALID_ORDER', message: 'Vui lòng nhập họ tên, số điện thoại, địa chỉ và phương thức thanh toán.' } }, { status: 400 });
  }
  const voucherCode = body.voucherCode?.trim().toUpperCase() ?? '';
  if (calculateVoucherDiscount(voucherCode, 0, 0) === null) {
    return NextResponse.json({ error: { code: 'INVALID_VOUCHER', message: 'Mã giảm giá không hợp lệ.' } }, { status: 400 });
  }

  const cartId = request.headers.get('cookie')?.match(/(?:^|;\s*)bohoch_cart=([^;]+)/)?.[1];
  if (!cartId) return NextResponse.json({ error: { code: 'EMPTY_CART', message: 'Giỏ hàng đang trống.' } }, { status: 400 });
  const sessionToken = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  const session = verifySessionToken(sessionToken ? decodeURIComponent(sessionToken) : undefined);

  return withDatabase(async () => {
    const order = await prisma.$transaction(async (transaction) => {
      const cart = await transaction.cart.findUnique({
        where: { id: decodeURIComponent(cartId) },
        include: { items: { include: { product: true, variant: true } } },
      });
      if (!cart?.items.length) return null;

      for (const item of cart.items) {
        const productStock = await transaction.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (!productStock.count) throw new Error('INSUFFICIENT_STOCK');
        if (item.variant) {
          const variantStock = await transaction.productVariant.updateMany({ where: { id: item.variant.id, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
          if (!variantStock.count) throw new Error('INSUFFICIENT_STOCK');
        }
      }

      const email = body.customer?.email?.trim().toLowerCase();
      const customer = email
        ? await transaction.customer.upsert({ where: { email }, create: { name, email, phone, address }, update: { name, phone, address } })
        : await transaction.customer.create({ data: { name, phone, address } });
      if (session?.userId) await transaction.user.update({ where: { id: session.userId }, data: { name, phone, address } });
      const subtotal = cart.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const shipping = calculateShipping(subtotal, cart.items.map((item) => item.product.slug));
      const discount = calculateVoucherDiscount(voucherCode, subtotal, shipping) ?? 0;
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
          totalAmount: subtotal + shipping - discount,
          note: body.note?.trim() || null,
          items: { create: cart.items.map((item) => ({ productId: item.productId, productVariantId: item.productVariantId, productName: item.productName, variantLabel: item.variant?.label, quantity: item.quantity, price: item.unitPrice, lineTotal: item.quantity * item.unitPrice })) },
        },
      });
    });

    if (!order) return NextResponse.json({ error: { code: 'EMPTY_CART', message: 'Giỏ hàng đang trống.' } }, { status: 400 });
    await prisma.cartItem.deleteMany({ where: { cartId: decodeURIComponent(cartId) } });
    return NextResponse.json({ orderId: order.id, orderCode: order.orderCode, numericCode: order.numericCode, status: order.orderStatus.toLowerCase(), total: order.totalAmount }, { status: 201 });
  }, 'Lỗi đặt hàng:');
}

