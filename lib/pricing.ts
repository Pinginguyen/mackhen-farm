export type FlashSalePricing = {
  price: number;
  originalPrice?: number | null;
  flashSaleEndsAt?: Date | string | null;
};

export function getEffectivePrice({ price, originalPrice, flashSaleEndsAt }: FlashSalePricing, now = Date.now()): number {
  if (!flashSaleEndsAt || originalPrice == null) return price;
  const endTime = flashSaleEndsAt instanceof Date ? flashSaleEndsAt.getTime() : Date.parse(flashSaleEndsAt);
  return Number.isFinite(endTime) && endTime <= now ? originalPrice : price;
}

export function isFlashSaleActive(product: FlashSalePricing, now = Date.now()): boolean {
  if (product.originalPrice == null || product.originalPrice <= product.price || !product.flashSaleEndsAt) return false;
  const endTime = product.flashSaleEndsAt instanceof Date ? product.flashSaleEndsAt.getTime() : Date.parse(product.flashSaleEndsAt);
  return Number.isFinite(endTime) && endTime > now;
}
