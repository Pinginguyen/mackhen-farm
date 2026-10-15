'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

type CartResponse = { items?: { quantity?: number }[] };
type CartUpdatedEvent = CustomEvent<{ count?: number }>;

export default function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let requestVersion = 0;
    const updateCount = async () => {
      const version = ++requestVersion;
      try {
        const response = await fetch('/api/cart', { cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json() as CartResponse;
        if (version !== requestVersion) return;
        setCount((result.items ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0));
      } catch {
        if (version === requestVersion) setCount(0);
      }
    };
    const onCartUpdated = (event: Event) => {
      const nextCount = (event as CartUpdatedEvent).detail?.count;
      if (typeof nextCount === 'number' && Number.isFinite(nextCount)) {
        requestVersion += 1;
        setCount(Math.max(0, nextCount));
        return;
      }
      void updateCount();
    };
    void updateCount();
    window.addEventListener('bohoch:cart-updated', onCartUpdated);
    return () => window.removeEventListener('bohoch:cart-updated', onCartUpdated);
  }, []);

  return (
    <Link className="header-cart" href="/cart" aria-label={`Giỏ hàng${count ? `, ${count} sản phẩm` : ''}`}>
      <ShoppingBag size={19} />
      {count > 0 && <span className="header-cart-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}