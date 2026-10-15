'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

type CartAddedEvent = CustomEvent<{ name?: string }>;

export default function CartToast() {
  const [productName, setProductName] = useState('');

  useEffect(() => {
    const handleCartAdded = (event: Event) => {
      const detail = (event as CartAddedEvent).detail;
      setProductName(detail?.name ?? 'Sản phẩm');
    };
    window.addEventListener('mackhen:cart-added', handleCartAdded);
    return () => window.removeEventListener('mackhen:cart-added', handleCartAdded);
  }, []);

  useEffect(() => {
    if (!productName) return;
    const timeout = window.setTimeout(() => setProductName(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [productName]);

  if (!productName) return null;
  return (
    <div className="cart-toast" role="status" aria-live="polite">
      <span className="cart-toast-check"><Check size={16} aria-hidden="true" /></span>
      <span className="cart-toast-copy">Đã thêm <strong>{productName}</strong> vào giỏ hàng!</span>
      <Link href="/cart">Xem giỏ hàng <span aria-hidden="true">→</span></Link>
      <button type="button" aria-label="Đóng thông báo" onClick={() => setProductName('')}><X size={16} /></button>
    </div>
  );
}