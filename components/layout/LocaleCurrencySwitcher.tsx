'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { playClickSound } from '@/components/common/SoundEffect';

export default function LocaleCurrencySwitcher() {
  const { locale, setLocaleCurrency } = useLocaleCurrency();

  return (
    <div
      className="locale-currency-switcher"
    >
      <button
        type="button"
        className={`locale-currency-option${locale === 'vi' ? ' is-selected' : ''}`}
        onClick={() => { playClickSound(); setLocaleCurrency('vi', 'VND'); }}
      >
        VNĐ
      </button>

      <button
        type="button"
        className={`locale-currency-option${locale === 'en' ? ' is-selected' : ''}`}
        onClick={() => { playClickSound(); setLocaleCurrency('en', 'SGD'); }}
      >
        SGD
      </button>
    </div>
  );
}