'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocaleCurrency } from '@/lib/i18n-context';

const options = [
  { code: 'vi', currency: 'VND', flag: '🇻🇳', currencyLabel: 'VNĐ', label: 'Tiếng Việt (VNĐ)' },
  { code: 'en', currency: 'SGD', flag: '🇸🇬', currencyLabel: 'SGD', label: 'English (SGD S$)' },
] as const;

export default function LocaleCurrencySwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { locale, currency, setLocaleCurrency } = useLocaleCurrency();

  const current = options.find((option) => option.code === locale) ?? options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
        aria-label="Chọn ngôn ngữ và tiền tệ"
        aria-expanded={isOpen}
      >
        <span>{current.flag} {current.currencyLabel}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white p-1 shadow-lg border border-stone-200 z-50 flex flex-col gap-0.5">
          {options.map((option) => {
            const isSelected = locale === option.code && currency === option.currency;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setLocaleCurrency(option.code, option.currency);
                  setIsOpen(false);
                }}
                className="py-2 px-3 text-xs rounded-lg hover:bg-stone-50 text-left text-stone-700 flex items-center justify-between cursor-pointer"
                aria-pressed={isSelected}
              >
                <span>{option.flag} {option.label}</span>
                {isSelected && <span aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}