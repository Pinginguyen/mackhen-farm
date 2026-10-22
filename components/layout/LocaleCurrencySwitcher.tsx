'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocaleCurrency } from '@/lib/i18n-context';

const options = [
  {
    code: 'vi',
    currency: 'VND',
    label: 'Tiếng Việt',
    subLabel: 'VNĐ',
    badge: 'VN',
  },
  {
    code: 'en',
    currency: 'SGD',
    label: 'English',
    subLabel: 'SGD',
    badge: 'SG',
  },
] as const;

export default function LocaleCurrencySwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { locale, currency, setLocaleCurrency } = useLocaleCurrency();

  const current = options.find((o) => o.code === locale) ?? options[0];

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
      {/* NÚT CHUẨN SPEC: Bo góc 14px, nền đỏ nâu #9B2424, chữ trắng sang trọng */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-center gap-2 h-9 px-4 rounded-[14px] bg-[#9B2424] hover:bg-[#831D1D] active:scale-[0.98] text-white font-semibold text-xs shadow-sm transition-all duration-200 cursor-pointer"
        aria-label="Chọn ngôn ngữ và tiền tệ"
      >
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/20 text-white">
          {current.badge}
        </span>
        <span className="tracking-wide">{current.subLabel}</span>
        <svg
          className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu thả xuống bo góc 14px đồng bộ */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-[14px] bg-white p-1.5 shadow-xl border border-stone-200/90 z-50 flex flex-col gap-1">
          {options.map((opt) => {
            const isSelected = locale === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLocaleCurrency(opt.code, opt.currency);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#9B2424]/10 text-[#9B2424] font-bold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-stone-200 bg-stone-50 text-stone-600">
                    {opt.badge}
                  </span>
                  <span>{opt.label} ({opt.subLabel})</span>
                </div>
                {isSelected && <span className="text-[#9B2424] font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}