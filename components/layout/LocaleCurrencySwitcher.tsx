'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function LocaleCurrencySwitcher() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { locale, currency, setLocaleCurrency } = useLocaleCurrency();
  const currentOption = locale === 'en' || currency === 'SGD' ? '🇸🇬 English (SGD S$)' : '🇻🇳 Tiếng Việt (VNĐ)';

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function selectLocale(localeValue: 'vi' | 'en', currencyValue: 'VND' | 'SGD') {
    setLocaleCurrency(localeValue, currencyValue);
    setIsOpen(false);
  }

  return (
    <div className="header-locale-wrap relative" ref={menuRef}>
      <button type="button" className="header-locale-switcher" aria-label={locale === 'en' ? 'Choose language and currency' : 'Chọn ngôn ngữ và tiền tệ'} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        {currentOption}
      </button>
      {isOpen && <div className="header-locale-dropdown absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-50">
        <button type="button" aria-pressed={locale === 'vi' && currency === 'VND'} onClick={() => selectLocale('vi', 'VND')}>🇻🇳 Tiếng Việt (VNĐ)</button>
        <button type="button" aria-pressed={locale === 'en' && currency === 'SGD'} onClick={() => selectLocale('en', 'SGD')}>🇸🇬 English (SGD S$)</button>
      </div>}
    </div>
  );
}