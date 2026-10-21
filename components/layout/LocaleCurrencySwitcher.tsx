'use client';

import { useRef } from 'react';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function LocaleCurrencySwitcher() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { locale, currency, setLocaleCurrency } = useLocaleCurrency();
  const currentOption = locale === 'en' || currency === 'SGD' ? '🇸🇬 English (SGD S$)' : '🇻🇳 Tiếng Việt (VNĐ)';

  return (
    <div className="header-locale-wrap">
      <details className="header-locale-switcher" ref={menuRef}>
        <summary aria-label={locale === 'en' ? 'Choose language and currency' : 'Chọn ngôn ngữ và tiền tệ'}>{currentOption}</summary>
        <div className="header-locale-dropdown">
          <button type="button" aria-pressed={locale === 'vi' && currency === 'VND'} onClick={() => { setLocaleCurrency('vi', 'VND'); menuRef.current?.removeAttribute('open'); }}>🇻🇳 Tiếng Việt (VNĐ)</button>
          <button type="button" aria-pressed={locale === 'en' && currency === 'SGD'} onClick={() => { setLocaleCurrency('en', 'SGD'); menuRef.current?.removeAttribute('open'); }}>🇸🇬 English (SGD S$)</button>
        </div>
      </details>
    </div>
  );
}