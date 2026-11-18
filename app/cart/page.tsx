import { fetchApiWithFallback } from '@/lib/server-api';
import CartContent, { CartPageHeading } from './cart-content';
import TasteGuarantee from '@/components/checkout/TasteGuarantee';
import { DEFAULT_SYSTEM_SETTINGS } from '@/lib/system-settings';
import { getProductRecommendations } from '@/lib/product-recommendations';
import ProductRecommendationShelf from '@/components/ProductRecommendationShelf';

export default async function CartPage() {
  const { data: cart } = await fetchApiWithFallback('/api/cart', { items: [] as { id: string; productId: string; productSlug: string; name: string; image: string; quantity: number; unitPrice: number; total: number; stock: number; variantId: string | null; variantLabel: string | null; upsellProduct: null; variants: { id: string; label: string; price: number; weight: string; stock: number }[] }[], subtotal: 0, shipping: 0, total: 0, freeShippingThreshold: DEFAULT_SYSTEM_SETTINGS.freeShippingThreshold, tasteGuaranteeText: DEFAULT_SYSTEM_SETTINGS.tasteGuaranteeText });
  const recommendations = await getProductRecommendations(cart.items.map((item) => item.productId));
  return (
    <main className="page-shell">
      <section className="page-card">
        <CartPageHeading />
        <TasteGuarantee text={cart.tasteGuaranteeText} />
        <CartContent initialItems={cart.items} freeShippingThreshold={cart.freeShippingThreshold} recommendations={recommendations} />
      </section>
    </main>
  );
}
