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
  const selectedLanguage = languages.find((l) => l.code === locale) ?? languages[0];

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
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Nút bấm kích hoạt trên Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
        aria-label={locale === 'en' ? 'Choose language and currency' : 'Chọn ngôn ngữ và tiền tệ'}
        aria-expanded={isOpen}
      >
        <span>{selectedLanguage.flag}</span>
        <span>{currency}</span>
        <span className="text-[10px] text-stone-400">▾</span>
      </button>

      {/* Menu thả xuống chuẩn: 2 hàng dọc xếp ngay ngắn dưới nút */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white p-1.5 shadow-xl border border-stone-200 z-[999] flex flex-col gap-1">
          {languages.map((language) => {
            const isSelected = locale === language.code && currency === language.currency;
            return (
              <button
                key={language.code}
                type="button"
                onClick={() => selectLocale(language)}
                className={`flex items-center justify-between w-full px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'bg-stone-100 text-[#8B1E1E] font-bold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm">{language.flag}</span>
                  <span>{language.label}</span>
                </span>
                {isSelected && <span className="text-[#8B1E1E] font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}