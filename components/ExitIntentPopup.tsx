'use client';

import { useEffect, useState } from 'react';
import { Gift, Mail, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const dismissedKey = 'mackhen_exit_intent_seen';

export default function ExitIntentPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    try {
      if (window.sessionStorage.getItem(dismissedKey)) return;
    } catch {
      return;
    }

    function handleMouseOut(event: MouseEvent) {
      if (event.clientY > 0 || event.relatedTarget !== null) return;
      showPopup();
    }

    function showPopup() {
      try {
        if (window.sessionStorage.getItem(dismissedKey)) return;
        window.sessionStorage.setItem(dismissedKey, '1');
      } catch {
        return;
      }
      setOpen(true);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden' && window.matchMedia('(pointer: coarse)').matches) showPopup();
    }

    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubscribing(true);
    setSubscriptionMessage('');
    try {
      const response = await fetch('/api/marketing/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, consent, source: 'EXIT_INTENT' }),
      });
      const result = await response.json() as { error?: { message?: string }; message?: string };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể đăng ký lúc này.');
      setSubscriptionMessage(result.message ?? 'Đã gửi ưu đãi đến email của bạn.');
    } catch (error) {
      setSubscriptionMessage(error instanceof Error ? error.message : 'Không thể kết nối để đăng ký.');
    } finally {
      setSubscribing(false);
    }
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
        <form className="exit-intent-subscribe" onSubmit={(event) => void subscribe(event)}>
          <label htmlFor="exit-intent-email"><Mail size={15} aria-hidden="true" /> Nhận mã ưu đãi qua email</label>
          <input id="exit-intent-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@email.com" required />
          <label className="exit-intent-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /> Tôi đồng ý nhận email ưu đãi từ Mắc Khén Farm.</label>
          <button type="submit" className="secondary-action" disabled={subscribing || !consent}>{subscribing ? 'Đang gửi...' : 'Gửi ưu đãi cho tôi'}</button>
          {subscriptionMessage && <small role="status">{subscriptionMessage}</small>}
        </form>
        <button type="button" className="exit-intent-continue" onClick={close}>Tiếp tục mua sắm nhận ưu đãi</button>
      </section>
    </div>
  );
}