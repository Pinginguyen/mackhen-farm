import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { calculateShipping } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

function cartIdFrom(request: Request): { id: string; isNew: boolean } {
  const value = request.headers.get('cookie')?.match(/(?:^|;\s*)bohoch_cart=([^;]+)/)?.[1];
  return value ? { id: decodeURIComponent(value), isNew: false } : { id: crypto.randomUUID(), isNew: true };
}

export function GET(request: Request) {
  return withDatabase(async () => {
  const cartId = cartIdFrom(request);
  const cart = await prisma.cart.findUnique({
    where: { id: cartId.id },
    include: { items: { include: { product: true, variant: true } } },
  });
  const items = (cart?.items ?? []).map((item) => ({
    id: item.id,
    productId: item.productId,
    productSlug: item.product.slug,
    variantId: item.productVariantId,
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
