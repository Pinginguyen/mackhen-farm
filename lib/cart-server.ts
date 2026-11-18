import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { calculateShipping, parseShippingWeightGrams } from '@/lib/shipping';
import { getSystemSettings } from '@/lib/system-settings';
import { getEffectivePrice } from '@/lib/pricing';

export type CartUpsellProduct = { id: string; slug: string; name: string; image: string; price: number; stock: number };
export type CartSnapshotItem = {
  id: string;
  productId: string;
  productSlug: string;
  image: string;
  variantId: string | null;
  variantLabel: string | null;
  variants: { id: string; label: string; price: number; weight: string; stock: number }[];
  upsellProduct: CartUpsellProduct | null;
  stock: number;
  name: string;
  quantity: number;
  unitPrice: number;
  weightGrams: number;
  total: number;
};

export async function readCartSnapshot({ buyNow = false }: { buyNow?: boolean } = {}): Promise<{ items: CartSnapshotItem[]; subtotal: number; shipping: number; total: number; freeShippingThreshold: number; tasteGuaranteeText: string; unavailable: boolean }> {
  const settings = await getSystemSettings();
  try {
    const cookieName = buyNow ? 'bohoch_buy_now' : 'bohoch_cart';
    const cartId = cookies().get(cookieName)?.value;
    if (!cartId) {
      return { items: [], subtotal: 0, shipping: 0, total: 0, freeShippingThreshold: settings.freeShippingThreshold, tasteGuaranteeText: settings.tasteGuaranteeText, unavailable: false };
    }

    const cart = await prisma.cart.findUnique({
      where: { id: decodeURIComponent(cartId) },
      include: { items: { include: { product: { include: { variants: true, upsellProduct: { select: { id: true, slug: true, name: true, image: true, price: true, originalPrice: true, flashSaleEndsAt: true, stock: true, active: true } } } }, variant: true } } },
    });

    const items = (cart?.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productSlug: item.product.slug,
      image: item.product.image,
      variantId: item.productVariantId,
      variantLabel: item.variant?.title ?? null,
      variants: item.product.variants.map((variant) => ({ ...variant, price: getEffectivePrice({ price: variant.price, originalPrice: variant.originalPrice, flashSaleEndsAt: item.product.flashSaleEndsAt }), label: variant.title, stock: variant.inventory })),
      upsellProduct: item.product.upsellProduct?.active ? { ...item.product.upsellProduct, price: getEffectivePrice(item.product.upsellProduct) } : null,
      stock: item.variant?.inventory ?? item.product.stock,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: getEffectivePrice({ price: item.variant?.price ?? item.product.price, originalPrice: item.variant?.originalPrice ?? item.product.originalPrice, flashSaleEndsAt: item.product.flashSaleEndsAt }),
      weightGrams: parseShippingWeightGrams(item.product.weight, item.variant?.weight),
      total: item.quantity * getEffectivePrice({ price: item.variant?.price ?? item.product.price, originalPrice: item.variant?.originalPrice ?? item.product.originalPrice, flashSaleEndsAt: item.product.flashSaleEndsAt }),
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const shipping = calculateShipping(subtotal, items.map((item) => item.productSlug), settings.freeShippingThreshold);

    return { items, subtotal, shipping, total: subtotal + shipping, freeShippingThreshold: settings.freeShippingThreshold, tasteGuaranteeText: settings.tasteGuaranteeText, unavailable: false };
  } catch {
    return { items: [], subtotal: 0, shipping: 0, total: 0, freeShippingThreshold: settings.freeShippingThreshold, tasteGuaranteeText: settings.tasteGuaranteeText, unavailable: true };
  }
}
