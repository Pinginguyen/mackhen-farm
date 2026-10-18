import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { calculateShipping } from '@/lib/shipping';

export type CartSnapshotItem = {
  id: string;
  productId: string;
  productSlug: string;
  image: string;
  variantId: string | null;
  variantLabel: string | null;
  variants: { id: string; label: string; price: number; weight: string; stock: number }[];
  stock: number;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export async function readCartSnapshot({ buyNow = false }: { buyNow?: boolean } = {}): Promise<{ items: CartSnapshotItem[]; subtotal: number; shipping: number; total: number; unavailable: boolean }> {
  try {
    const cookieName = buyNow ? 'bohoch_buy_now' : 'bohoch_cart';
    const cartId = cookies().get(cookieName)?.value;
    if (!cartId) {
      return { items: [], subtotal: 0, shipping: 0, total: 0, unavailable: false };
    }

    const cart = await prisma.cart.findUnique({
      where: { id: decodeURIComponent(cartId) },
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
    const shipping = calculateShipping(subtotal, items.map((item) => item.productSlug));

    return { items, subtotal, shipping, total: subtotal + shipping, unavailable: false };
  } catch {
    return { items: [], subtotal: 0, shipping: 0, total: 0, unavailable: true };
  }
}
