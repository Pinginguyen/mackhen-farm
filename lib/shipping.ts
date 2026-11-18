export const FREE_SHIPPING_PRODUCT_SLUG = 'combo-bo-ba-nhau-xanh';

export function parseShippingWeightGrams(productWeight?: number | null, variantWeight?: string | null): number {
  const variantMatch = variantWeight?.match(/(\d+(?:\.\d+)?)\s*(kg|g)?/i);
  if (variantMatch) {
    const value = Number(variantMatch[1]);
    if (Number.isFinite(value) && value > 0) return Math.round(variantMatch[2]?.toLowerCase() === 'kg' ? value * 1000 : value);
  }
  return Number.isSafeInteger(productWeight) && Number(productWeight) > 0 ? Number(productWeight) : 500;
}

export function calculateShipping(subtotal: number, productSlugs: string[], freeShippingThreshold: number): number {
  if (!productSlugs.length || subtotal >= freeShippingThreshold || productSlugs.includes(FREE_SHIPPING_PRODUCT_SLUG)) {
    return 0;
  }

  return 35000;
}