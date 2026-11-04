export const FREE_SHIPPING_PRODUCT_SLUG = 'combo-bo-ba-nhau-xanh';

export function calculateShipping(subtotal: number, productSlugs: string[], freeShippingThreshold: number): number {
  if (!productSlugs.length || subtotal >= freeShippingThreshold || productSlugs.includes(FREE_SHIPPING_PRODUCT_SLUG)) {
    return 0;
  }

  return 35000;
}