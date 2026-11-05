'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearAffiliateCode, COOKIE_CONSENT_KEY } from '@/lib/affiliate-attribution';

type ConsentChoice = 'accepted' | 'rejected' | null;

export default function CookieConsent() {
  const [choice, setChoice] = useState<ConsentChoice>(null);

  useEffect(() => {
    try {
      const storedChoice = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      if (storedChoice === 'accepted' || storedChoice === 'rejected') setChoice(storedChoice);
    } catch {
      setChoice(null);
    }
  }, []);

  function chooseConsent(nextChoice: Exclude<ConsentChoice, null>) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, nextChoice);
    } catch {
      // The current page can still honor the selection if storage is unavailable.
    }
    if (nextChoice === 'rejected') clearAffiliateCode();
    setChoice(nextChoice);
    window.dispatchEvent(new Event('mkf-cookie-consent-change'));
  }

  if (choice) return null;

  return (
    <aside className="cookie-consent" role="dialog" aria-label="Tùy chọn Cookie">
      <p>
        Mắc Khén Farm sử dụng Cookie để tối ưu trải nghiệm và đối soát tiếp thị. Bằng cách tiếp tục, bạn đồng ý với{' '}
        <Link href="/chinh-sach-bao-mat">Chính sách Bảo mật</Link> của chúng tôi.
      </p>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-consent-accept" onClick={() => chooseConsent('accepted')}>Chấp nhận</button>
        <button type="button" className="cookie-consent-reject" onClick={() => chooseConsent('rejected')}>Từ chối</button>
      </div>
    </aside>
  );
}