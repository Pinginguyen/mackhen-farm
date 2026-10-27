import Link from 'next/link';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { readCartSnapshot } from '@/lib/cart-server';
import CheckoutForm, { BuyNowCartRecovery, CheckoutHeading } from './checkout-form';
import CheckoutEmptyState from '@/components/CheckoutEmptyState';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import CheckoutOrderSummary from './checkout-order-summary';

export default async function CheckoutPage({ searchParams }: { searchParams?: { mode?: string; paymentMethod?: string } }) {
  const buyNow = searchParams?.mode === 'buy_now';
  const cart = await readCartSnapshot({ buyNow });
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
  const freeShippingApplied = cart.subtotal >= FREE_SHIPPING_THRESHOLD;
  const orderSummary = <CheckoutOrderSummary
    items={cart.items.map((item) => ({ id: `${item.productId}-${item.variantId ?? 'single'}`, name: item.name ?? 'Sản phẩm', quantity: item.quantity ?? 1, total: item.total ?? 0 }))}
    shipping={cart.shipping}
    total={cart.total}
    freeShippingApplied={freeShippingApplied}
  />;
  return (
    <main className="page-shell checkout-page">
      <section className="page-card">
        <div className="page-title">
          <div>
            <p className="eyebrow">Checkout</p>
            <CheckoutHeading />
          </div>
        </div>

        {buyNow && <BuyNowCartRecovery items={cart.items} />}
        <div className={`checkout-layout${cart.unavailable || cart.items.length === 0 ? ' is-empty' : ''}`}>
          <div>
            {cart.unavailable || cart.items.length === 0 ? (
              <CheckoutEmptyState unavailable={cart.unavailable} buyNow={buyNow} />
            ) : (
              <CheckoutForm items={cart.items} initialCustomer={initialCustomer ?? undefined} subtotal={cart.subtotal} shipping={cart.shipping} buyNow={buyNow} initialPaymentMethod={searchParams?.paymentMethod === 'COD' ? 'COD' : 'VIETQR'} mobileSummary={orderSummary} />
            )}
          </div>

          {!cart.unavailable && cart.items.length > 0 && <aside className="summary-card checkout-desktop-summary">{orderSummary}</aside>}
        </div>
      </section>
    </main>
  );
}
