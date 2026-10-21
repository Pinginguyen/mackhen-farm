'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocaleCurrency } from '@/lib/i18n-context';

const languages = [
  { code: 'vi', label: 'Tiếng Việt (VNĐ)', flag: '🇻🇳', currency: 'VND' },
  { code: 'en', label: 'English (SGD S$)', flag: '🇸🇬', currency: 'SGD' },
] as const;

export default function LocaleCurrencySwitcher() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { locale, currency, setLocaleCurrency } = useLocaleCurrency();
  const selectedLanguage = languages.find((language) => language.code === locale) ?? languages[0];

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

  function selectLocale(language: (typeof languages)[number]) {
    setLocaleCurrency(language.code, language.currency);
    setIsOpen(false);
  }

  return (
    <div className="header-locale-wrap relative inline-block" ref={menuRef}>
      <button type="button" className="header-locale-switcher" aria-label={locale === 'en' ? 'Choose language and currency' : 'Chọn ngôn ngữ và tiền tệ'} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        {selectedLanguage.flag} {currency} <span aria-hidden="true">▾</span>
      </button>
      {isOpen && <div className="header-locale-dropdown absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 z-50">
        {languages.map((language) => <button
          key={language.code}
          type="button"
          aria-pressed={locale === language.code && currency === language.currency}
          onClick={() => selectLocale(language)}
        >{language.flag} {language.label}</button>)}
      </div>}
    </div>
  );
}