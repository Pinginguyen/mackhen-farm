import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { calculateShipping } from '@/lib/shipping';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';

export async function POST(request: Request) {
  let body: { productId?: string; variantId?: string; quantity?: number; buyNow?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Yêu cầu không hợp lệ' } }, { status: 400 });
  }

  if (typeof body.productId !== 'string' || !body.productId.trim() || !Number.isInteger(body.quantity) || !body.quantity || body.quantity < 1 || body.quantity > 20) {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Số lượng mỗi sản phẩm phải từ 1 đến 20.' } }, { status: 400 });
  }
  const quantity = body.quantity;

  return withDatabase(async () => {
  let product = await prisma.product.findFirst({
    where: { active: true, OR: [{ id: body.productId }, { slug: body.productId }] },
    include: { variants: true },
  });
  if (!product) {
    const legacySlug = body.productId === 'mkf-combo-3' ? 'combo-bo-ba-nhau-xanh' : null;
    const fallback = DEFAULT_PRODUCTS.find((item) => item.id === body.productId || item.slug === body.productId || item.slug === legacySlug);
    if (fallback) {
      try {
        product = await prisma.product.upsert({
          where: { id: fallback.id },
          create: {
            id: fallback.id,
            slug: fallback.slug,
            name: fallback.name,
            category: fallback.category,
            price: fallback.price,
            originalPrice: fallback.originalPrice,
            unit: fallback.unit,
            weight: fallback.weight,
            protein: fallback.protein,
            rating: fallback.rating,
            stock: fallback.stock,
            description: fallback.description,
            image: fallback.image,
            images: fallback.images,
            highlight: fallback.highlight,
            active: fallback.active,
          },
          update: {},
          include: { variants: true },
        });
      } catch (error) {
        if (!(error instanceof Error) || (error as Error & { code?: string }).code !== 'P2002') throw error;
        product = await prisma.product.findFirst({ where: { slug: fallback.slug }, include: { variants: true } });
      }
    }
  }
  if (!product) return NextResponse.json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm' } }, { status: 404 });
  if (!product.active) return NextResponse.json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Sản phẩm hiện không khả dụng' } }, { status: 404 });

  const variant = body.variantId ? product.variants.find((item) => item.id === body.variantId) : undefined;
  if (body.variantId && !variant) return NextResponse.json({ error: { code: 'VARIANT_NOT_FOUND', message: 'Không tìm thấy phân loại' } }, { status: 404 });
  const availableStock = variant?.stock ?? product.stock;
  if (quantity > availableStock) return NextResponse.json({ error: { code: 'INSUFFICIENT_STOCK', message: 'Số lượng vượt quá tồn kho' } }, { status: 409 });

  const buyNow = body.buyNow === true;
  const cookieName = buyNow ? 'bohoch_buy_now' : 'bohoch_cart';
  const cartId = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))?.[1];
  const id = cartId ? decodeURIComponent(cartId) : crypto.randomUUID();
  const outcome = await prisma.$transaction(async (transaction) => {
    await transaction.cart.upsert({ where: { id }, create: { id }, update: {} });
    if (buyNow) await transaction.cartItem.deleteMany({ where: { cartId: id } });
    const existing = await transaction.cartItem.findFirst({
      where: { cartId: id, productId: product.id, productVariantId: variant?.id ?? null },
    });
    const nextQuantity = Number(existing?.quantity ?? 0) + Number(quantity);
    if (nextQuantity > availableStock) return { error: 'INSUFFICIENT_STOCK' as const };
    if (existing) {
      return { item: await transaction.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } }) };
    }
    return {
      item: await transaction.cartItem.create({
        data: {
          cartId: id,
          productId: product.id,
          productVariantId: variant?.id,
          productName: product.name,
          quantity: nextQuantity,
          unitPrice: variant?.price ?? product.price,
        },
      }),
    };
  });
  if ('error' in outcome) return NextResponse.json({ error: { code: outcome.error, message: 'Tổng số lượng vượt quá tồn kho' } }, { status: 409 });
  const item = outcome.item;
  const cartItems = await prisma.cartItem.findMany({ where: { cartId: id }, include: { product: { select: { slug: true } } } });
  const total = cartItems.reduce((sum, cartItem) => sum + cartItem.quantity * cartItem.unitPrice, 0);
  const shipping = calculateShipping(total, cartItems.map((cartItem) => cartItem.product.slug));
  const cartCount = cartItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
  const response = NextResponse.json({
    item: { id: item.id, productId: item.productId, variantId: item.productVariantId, quantity: item.quantity },
    totals: { subtotal: total, shipping, total: total + shipping },
    cartCount: buyNow ? undefined : cartCount,
  });
  if (!cartId) response.cookies.set(cookieName, id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
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

  if (!body.itemId || !('variantId' in body) || !Number.isInteger(body.quantity) || !body.quantity || body.quantity < 1 || body.quantity > 20) {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Số lượng mỗi sản phẩm phải từ 1 đến 20.' } }, { status: 400 });
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
    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    return NextResponse.json({ item: result.item, totals: { subtotal, shipping, total: subtotal + shipping }, cartCount });
  });
}

export async function DELETE(request: Request) {
  let body: { itemId?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Yêu cầu không hợp lệ' } }, { status: 400 });
  }
  if (!body.itemId || typeof body.itemId !== 'string') {
    return NextResponse.json({ error: { code: 'INVALID_CART_ITEM', message: 'Thiếu sản phẩm cần xóa' } }, { status: 400 });
  }
  const cartId = request.headers.get('cookie')?.match(/(?:^|;\s*)bohoch_cart=([^;]+)/)?.[1];
  if (!cartId) return NextResponse.json({ error: { code: 'CART_NOT_FOUND', message: 'Không tìm thấy giỏ hàng' } }, { status: 404 });
  const decodedCartId = decodeURIComponent(cartId);

  return withDatabase(async () => {
    const deleted = await prisma.cartItem.deleteMany({ where: { id: body.itemId, cartId: decodedCartId } });
    if (!deleted.count) return NextResponse.json({ error: { code: 'CART_ITEM_NOT_FOUND', message: 'Không tìm thấy sản phẩm trong giỏ hàng' } }, { status: 404 });

    const items = await prisma.cartItem.findMany({ where: { cartId: decodedCartId }, include: { product: { select: { slug: true } } } });
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const shipping = calculateShipping(subtotal, items.map((item) => item.product.slug));
    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    return NextResponse.json({ totals: { subtotal, shipping, total: subtotal + shipping }, cartCount });
  });
}
