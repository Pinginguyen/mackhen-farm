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
    badgeStyle: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    code: 'en',
    currency: 'SGD',
    label: 'English',
    subLabel: 'SGD (S$)',
    badge: 'SG',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200',
  },
] as const;

export default function LocaleCurrencySwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { locale, currency, setLocaleCurrency } = useLocaleCurrency();

  const current = options.find((o) => o.code === locale) ?? options[0];

  // Đóng menu khi bấm ra ngoài
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
      {/* Nút bấm viên thuốc sang trọng trên Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-all shadow-xs text-xs font-medium cursor-pointer"
        aria-label="Chọn ngôn ngữ và tiền tệ"
      >
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${current.badgeStyle}`}>
          {current.badge}
        </span>
        <span className="font-semibold text-stone-800">{current.subLabel}</span>
        <svg
          className={`w-3 h-3 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu thả xuống dạng Card bo tròn cao cấp */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200 z-50 flex flex-col gap-1">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
            Khu vực & Tiền tệ
          </div>
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
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-stone-100 text-[#8B1E1E] font-bold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${opt.badgeStyle}`}>
                    {opt.badge}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium text-stone-800">{opt.label}</span>
                    <span className="text-[10px] text-stone-400 font-normal">{opt.subLabel}</span>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-[#8B1E1E] text-sm font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}