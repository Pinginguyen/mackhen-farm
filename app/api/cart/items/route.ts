import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { calculateShipping } from '@/lib/shipping';

export async function POST(request: Request) {
  let body: { productId?: string; variantId?: string; quantity?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Yêu cầu không hợp lệ' } }, { status: 400 });
  }

  if (!body.productId || !Number.isInteger(body.quantity) || !body.quantity || body.quantity < 1) {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Thiếu thông tin sản phẩm' } }, { status: 400 });
  }
  const quantity = body.quantity;

  return withDatabase(async () => {
  const product = await prisma.product.findFirst({
    where: { active: true, OR: [{ id: body.productId }, { slug: body.productId }] },
    include: { variants: true },
  });
  if (!product) return NextResponse.json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm' } }, { status: 404 });

  const variant = body.variantId ? product.variants.find((item) => item.id === body.variantId) : undefined;
  if (body.variantId && !variant) return NextResponse.json({ error: { code: 'VARIANT_NOT_FOUND', message: 'Không tìm thấy phân loại' } }, { status: 404 });
  const availableStock = variant?.stock ?? product.stock;
  if (quantity > availableStock) return NextResponse.json({ error: { code: 'INSUFFICIENT_STOCK', message: 'Số lượng vượt quá tồn kho' } }, { status: 409 });

  const cartId = request.headers.get('cookie')?.match(/(?:^|;\s*)bohoch_cart=([^;]+)/)?.[1];
  const id = cartId ? decodeURIComponent(cartId) : crypto.randomUUID();
  const item = await prisma.$transaction(async (transaction) => {
    await transaction.cart.upsert({ where: { id }, create: { id }, update: {} });
    const existing = await transaction.cartItem.findFirst({
      where: { cartId: id, productId: product.id, productVariantId: variant?.id ?? null },
    });
    if (existing) {
      return transaction.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
    }
    return transaction.cartItem.create({
      data: {
        cartId: id,
        productId: product.id,
        productVariantId: variant?.id,
        productName: product.name,
        quantity,
        unitPrice: variant?.price ?? product.price,
      },
    });
  });
  const cartItems = await prisma.cartItem.findMany({ where: { cartId: id }, include: { product: { select: { slug: true } } } });
  const total = cartItems.reduce((sum, cartItem) => sum + cartItem.quantity * cartItem.unitPrice, 0);
  const shipping = calculateShipping(total, cartItems.map((cartItem) => cartItem.product.slug));
  const response = NextResponse.json({
    item: { id: item.id, productId: item.productId, variantId: item.productVariantId, quantity: item.quantity },
    totals: { subtotal: total, shipping, total: total + shipping },
  });
  if (!cartId) response.cookies.set('bohoch_cart', id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
  });
}

export async function PATCH(request: Request) {
  let body: { itemId?: string; variantId?: string | null; quantity?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Yêu cầu không hợp lệ' } }, { status: 400 });
  }

  if (!body.itemId || !('variantId' in body) || !Number.isInteger(body.quantity) || !body.quantity || body.quantity < 1) {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Thông tin cập nhật giỏ hàng không hợp lệ' } }, { status: 400 });
  }

  const cartId = request.headers.get('cookie')?.match(/(?:^|;\s*)bohoch_cart=([^;]+)/)?.[1];
  if (!cartId) return NextResponse.json({ error: { code: 'CART_NOT_FOUND', message: 'Không tìm thấy giỏ hàng' } }, { status: 404 });
  const decodedCartId = decodeURIComponent(cartId);

  return withDatabase(async () => {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.cartItem.findFirst({
        where: { id: body.itemId, cartId: decodedCartId },
        include: { product: { include: { variants: true } } },
      });
      if (!current) return { error: 'CART_ITEM_NOT_FOUND', status: 404 as const, message: 'Không tìm thấy sản phẩm trong giỏ hàng' };

      const variant = body.variantId
        ? current.product.variants.find((item) => item.id === body.variantId)
        : undefined;
      if (body.variantId && !variant) return { error: 'VARIANT_NOT_FOUND', status: 404 as const, message: 'Không tìm thấy phân loại' };

      const quantity = body.quantity as number;
      const availableStock = variant?.stock ?? current.product.stock;
      if (quantity > availableStock) return { error: 'INSUFFICIENT_STOCK', status: 409 as const, message: 'Số lượng vượt quá tồn kho' };

      const variantId = variant?.id ?? null;
      const duplicate = await transaction.cartItem.findFirst({
        where: { cartId: decodedCartId, productId: current.productId, productVariantId: variantId, id: { not: current.id } },
      });
      if (duplicate) {
        if (duplicate.quantity + quantity > availableStock) {
          return { error: 'INSUFFICIENT_STOCK', status: 409 as const, message: 'Tổng số lượng phân loại vượt quá tồn kho' };
        }
        const item = await transaction.cartItem.update({
          where: { id: duplicate.id },
          data: { quantity: duplicate.quantity + quantity },
        });
        await transaction.cartItem.delete({ where: { id: current.id } });
        return { item };
      }

      const item = await transaction.cartItem.update({
        where: { id: current.id },
        data: {
          productVariantId: variantId,
          productName: current.product.name,
          quantity,
          unitPrice: variant?.price ?? current.product.price,
        },
      });
      return { item };
    });

    if ('error' in result) {
      return NextResponse.json({ error: { code: result.error, message: result.message } }, { status: result.status });
    }

    const cartItems = await prisma.cartItem.findMany({ where: { cartId: decodedCartId }, include: { product: { select: { slug: true } } } });
    const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const shipping = calculateShipping(subtotal, cartItems.map((item) => item.product.slug));
    return NextResponse.json({ item: result.item, totals: { subtotal, shipping, total: subtotal + shipping } });
  });
}
