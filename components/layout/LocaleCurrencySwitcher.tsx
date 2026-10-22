'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';

export default function LocaleCurrencySwitcher() {
  const { locale, setLocaleCurrency } = useLocaleCurrency();

  return (
    <div className="inline-flex items-center p-0.5 bg-stone-100 rounded-[14px] border border-stone-200/80 shadow-2xs">
      {/* Nút Tiếng Việt (VNĐ) */}
      <button
        type="button"
        onClick={() => setLocaleCurrency('vi', 'VND')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-[11px] transition-all duration-200 cursor-pointer ${
          locale === 'vi'
            ? 'bg-[#9B2424] text-white shadow-sm'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
        }`}
      >
        🇻🇳 VNĐ
      </button>

      {/* Nút English (SGD) */}
      <button
        type="button"
        onClick={() => setLocaleCurrency('en', 'SGD')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-[11px] transition-all duration-200 cursor-pointer ${
          locale === 'en'
            ? 'bg-[#9B2424] text-white shadow-sm'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
        }`}
      >
        🇸🇬 SGD
      </button>
    </div>
  );
}