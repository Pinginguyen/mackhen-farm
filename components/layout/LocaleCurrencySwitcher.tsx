'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';

export default function LocaleCurrencySwitcher() {
  const { locale, setLocaleCurrency } = useLocaleCurrency();

  return (
    <div className="relative inline-flex items-center">
      <select
        value={locale}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'en') {
            setLocaleCurrency('en', 'SGD');
          } else {
            setLocaleCurrency('vi', 'VND');
          }
        }}
        aria-label="Chọn ngôn ngữ và tiền tệ"
        className="cursor-pointer appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-stone-700 shadow-xs hover:border-stone-300 hover:bg-stone-50 focus:border-[#8B1E1E] focus:outline-hidden transition-colors"
      >
        <option value="vi">🇻🇳 Tiếng Việt (VNĐ)</option>
        <option value="en">🇸🇬 English (SGD S$)</option>
      </select>
      
      {/* Mũi tên nhỏ tinh tế */}
      <span className="pointer-events-none absolute right-2 text-[10px] text-stone-400">
        ▼
      </span>
    </div>
  );
}