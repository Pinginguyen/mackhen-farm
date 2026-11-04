import Link from 'next/link';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { readCartSnapshot } from '@/lib/cart-server';
import CheckoutForm, { BuyNowCartRecovery, CheckoutHeading } from './checkout-form';
import CheckoutEmptyState from '@/components/CheckoutEmptyState';
import CheckoutOrderSummary from './checkout-order-summary';
import CroEventTracker from '@/components/CroEventTracker';
import TasteGuarantee from '@/components/checkout/TasteGuarantee';
import type { CartUpsellProduct } from '@/components/cart/CartUpsell';

export default async function CheckoutPage({ searchParams }: { searchParams?: { mode?: string; paymentMethod?: string } }) {
  const buyNow = searchParams?.mode === 'buy_now';
  const cart = await readCartSnapshot({ buyNow });
  const cartItems = Array.isArray(cart?.items) ? cart.items : [];
  const cartUnavailable = !cart || Boolean(cart.unavailable);
  const subtotal = cart?.subtotal ?? 0;
  const shipping = cart?.shipping ?? 0;
  const total = cart?.total ?? 0;
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  let profile = null;
  if (session) {
    try {
      profile = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true, address: true } });
    } catch {
      profile = null;
    }
  }
  const initialCustomer = profile ? { ...profile, phone: profile.phone ?? '', address: profile.address ?? '' } : undefined;
  const freeShippingApplied = cart.freeShippingThreshold > 0 && subtotal >= cart.freeShippingThreshold;
  const upsellProduct = cartItems.map((item) => item.upsellProduct).find((product): product is CartUpsellProduct => Boolean(product && product.stock > 0 && !cartItems.some((item) => item.productId === product.id)));
  const orderSummary = <CheckoutOrderSummary
    items={cartItems.map((item) => ({ id: `${item.productId}-${item.variantId ?? 'single'}`, name: item.name ?? 'Sản phẩm', quantity: item.quantity ?? 1, total: item.total ?? 0 }))}
    shipping={shipping}
    total={total}
    freeShippingApplied={freeShippingApplied}
  />;
  return (
    <main className="page-shell checkout-page">
      {!cartUnavailable && cartItems.length > 0 && <CroEventTracker eventType="CHECKOUT_START" />}
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Checkout</p>
            <CheckoutHeading />
          </div>
        </div>

        <TasteGuarantee text={cart.tasteGuaranteeText} />

        {buyNow && <BuyNowCartRecovery items={cartItems} />}
        <div className={`checkout-layout${cartUnavailable || cartItems.length === 0 ? ' is-empty' : ''}`}>
          <div>
            {cartUnavailable || cartItems.length === 0 ? (
              <CheckoutEmptyState unavailable={cartUnavailable} buyNow={buyNow} />
            ) : (
              <CheckoutForm items={cartItems} initialCustomer={initialCustomer ?? undefined} subtotal={subtotal} shipping={shipping} freeShippingThreshold={cart.freeShippingThreshold} upsellProduct={upsellProduct} buyNow={buyNow} initialPaymentMethod={searchParams?.paymentMethod === 'COD' ? 'COD' : 'VIETQR'} mobileSummary={orderSummary} />
            )}
          </div>

          {!cartUnavailable && cartItems.length > 0 && <aside className="summary-card checkout-desktop-summary">{orderSummary}</aside>}
        </div>
      </section>
    </main>
  );
}
