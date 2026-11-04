'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, PackageSearch, ShoppingBag, Utensils } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

type CartCountEvent = CustomEvent<{ count?: number }>;

export default function MobileBottomDock() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const { locale } = useLocaleCurrency();
  const isEN = locale === 'en';

  useEffect(() => {
    let active = true;
    const updateCount = async () => {
      try {
        const response = await fetch('/api/cart', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as { items?: { quantity?: number }[] };
        if (active) setCount((data.items ?? []).reduce((total, item) => total + (Number(item.quantity) || 0), 0));
      } catch {
        return;
      }
    };
    const onCartUpdate = (event: Event) => {
      const nextCount = (event as CartCountEvent).detail?.count;
      if (typeof nextCount === 'number') setCount(Math.max(0, nextCount));
      else void updateCount();
    };
    void updateCount();
    window.addEventListener('bohoch:cart-updated', onCartUpdate);
    return () => {
      active = false;
      window.removeEventListener('bohoch:cart-updated', onCartUpdate);
    };
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const links = [
    { href: '/', label: isEN ? 'Home' : 'Trang chủ', icon: House },
    { href: '/products', label: isEN ? 'Products' : 'Sản phẩm', icon: Utensils },
    { href: '/tra-cuu', label: isEN ? 'Track' : 'Tra cứu', icon: PackageSearch },
  ];

  return (
    <nav className="mobile-bottom-dock" aria-label={isEN ? 'Quick navigation' : 'Điều hướng nhanh'}>
      {links.slice(0, 2).map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} aria-current={pathname === href ? 'page' : undefined}><Icon size={20} /><span>{label}</span></Link>)}
      <button type="button" aria-label={`${isEN ? 'Cart' : 'Giỏ hàng'}${count ? `, ${count}` : ''}`} onClick={() => window.dispatchEvent(new Event('mackhen:cart-drawer-open'))}>
        <span className="mobile-dock-cart-icon"><ShoppingBag size={20} />{count > 0 && <i key={count}>{count > 99 ? '99+' : count}</i>}</span><span>{isEN ? 'Cart' : 'Giỏ hàng'}</span>
      </button>
      <Link href={links[2].href} aria-label={links[2].label} aria-current={pathname.startsWith('/tra-cuu') ? 'page' : undefined}><PackageSearch size={20} /><span>{links[2].label}</span></Link>
    </nav>
  );
}