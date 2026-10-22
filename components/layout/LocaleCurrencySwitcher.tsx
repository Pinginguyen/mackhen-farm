'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';

export default function LocaleCurrencySwitcher() {
  const { locale, setLocaleCurrency } = useLocaleCurrency();

  return (
    <div className="h-9 inline-flex items-center gap-1.5 px-2 rounded-xl border border-stone-200/70 bg-white text-[11px] font-medium tracking-wider text-stone-600 shadow-xs">
      {/* Tiếng Việt / VNĐ */}
      <button
        type="button"
        onClick={() => setLocaleCurrency('vi', 'VND')}
        className={`h-7 px-2 rounded-lg transition-all duration-300 cursor-pointer ${
          locale === 'vi'
            ? 'bg-white text-[#9B2424] font-bold shadow-2xs'
            : 'hover:text-stone-900'
        }`}
      >
        VNĐ
      </button>

      <span className="text-stone-300 text-[10px]">|</span>

      {/* English / SGD */}
      <button
        type="button"
        onClick={() => setLocaleCurrency('en', 'SGD')}
        className={`h-7 px-2 rounded-lg transition-all duration-300 cursor-pointer ${
          locale === 'en'
            ? 'bg-white text-[#9B2424] font-bold shadow-2xs'
            : 'hover:text-stone-900'
        }`}
      >
        SGD
      </button>
    </div>
  );
}