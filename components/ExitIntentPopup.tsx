'use client';

import { useEffect, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const dismissedKey = 'mackhen_exit_intent_seen';

export default function ExitIntentPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    try {
      if (window.sessionStorage.getItem(dismissedKey)) return;
    } catch {
      return;
    }

    function handleMouseOut(event: MouseEvent) {
      if (event.clientY > 0 || event.relatedTarget !== null) return;
      try {
        if (window.sessionStorage.getItem(dismissedKey)) return;
        window.sessionStorage.setItem(dismissedKey, '1');
      } catch {
        return;
      }
      setOpen(true);
    }

    document.addEventListener('mouseout', handleMouseOut);
    return () => document.removeEventListener('mouseout', handleMouseOut);
  }, [pathname]);

  function close() {
    try {
      window.sessionStorage.setItem(dismissedKey, '1');
    } catch {
      // The popup still closes if storage is unavailable.
    }
    setOpen(false);
  }

  async function useOffer() {
    try {
      await navigator.clipboard.writeText('GIAM10');
      setCopied(true);
    } catch {
      setCopied(false);
    }
    try {
      window.sessionStorage.setItem('checkout_voucher', 'GIAM10');
    } catch {
      // Checkout remains available even if the offer cannot be staged.
    }
    window.location.assign('/checkout');
  }

  if (!open) return null;
  return (
    <div className="exit-intent-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="exit-intent-modal" role="dialog" aria-modal="true" aria-labelledby="exit-intent-title">
        <button type="button" className="exit-intent-close" aria-label="Đóng ưu đãi" onClick={close}><X size={19} /></button>
        <span className="exit-intent-icon"><Gift size={24} aria-hidden="true" /></span>
        <p className="eyebrow">Ưu đãi dành cho bạn</p>
        <h2 id="exit-intent-title">KHOAN ĐÃ! BẠN CÓ ƯU ĐÃI CHƯA DÙNG</h2>
        <p>Mắc Khén Farm tặng bạn mã ưu đãi GIAM10 giảm ngay 10% cho đơn hàng khô bò thực vật đầu tiên.</p>
        <div className="exit-intent-code">GIAM10</div>
        <button type="button" className="primary-action" onClick={() => void useOffer()}>{copied ? 'Đã sao chép · Dùng ngay' : 'Tự động sao chép & Dùng ngay'}</button>
        <button type="button" className="exit-intent-continue" onClick={close}>Tiếp tục mua sắm nhận ưu đãi</button>
      </section>
    </div>
  );
}