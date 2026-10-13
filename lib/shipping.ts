export const FREE_SHIPPING_THRESHOLD = 169000;
export const FREE_SHIPPING_PRODUCT_SLUG = 'combo-bo-ba-nhau-xanh';

export function calculateShipping(subtotal: number, productSlugs: string[]): number {
  if (!productSlugs.length || subtotal >= FREE_SHIPPING_THRESHOLD || productSlugs.includes(FREE_SHIPPING_PRODUCT_SLUG)) {
    return 0;
  }

  return 35000;
}