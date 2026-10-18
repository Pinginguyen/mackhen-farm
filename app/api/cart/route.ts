import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { calculateShipping } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

function cartIdFrom(request: Request, buyNow: boolean): { id: string; isNew: boolean } {
  const cookieName = buyNow ? 'bohoch_buy_now' : 'bohoch_cart';
  const value = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))?.[1];
  if (value) return { id: decodeURIComponent(value), isNew: false };
  return buyNow ? { id: '', isNew: false } : { id: crypto.randomUUID(), isNew: true };
}

export function GET(request: Request) {
  return withDatabase(async () => {
  const buyNow = new URL(request.url).searchParams.get('buyNow') === '1';
  const cartId = cartIdFrom(request, buyNow);
  if (!cartId.id) return NextResponse.json({ items: [], subtotal: 0, shipping: 0, total: 0 });
  const cart = await prisma.cart.findUnique({
    where: { id: cartId.id },
    include: { items: { include: { product: { include: { variants: true } }, variant: true } } },
  });
  const items = (cart?.items ?? []).map((item) => ({
    id: item.id,
    productId: item.productId,
    productSlug: item.product.slug,
    image: item.product.image,
    variantId: item.productVariantId,
    variantLabel: item.variant?.title ?? null,
    variants: item.product.variants.map((variant) => ({ ...variant, label: variant.title, stock: variant.inventory })),
    stock: item.variant?.inventory ?? item.product.stock,
    name: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.quantity * item.unitPrice,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const shipping = calculateShipping(subtotal, (cart?.items ?? []).map((item) => item.product.slug));
  const response = NextResponse.json({ items, subtotal, shipping, total: subtotal + shipping });

  if (cartId.isNew) response.cookies.set('bohoch_cart', cartId.id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
  });
}
