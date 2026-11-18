'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { playClickSound } from '@/components/common/SoundEffect';

export default function LocaleCurrencySwitcher() {
  const { currency, setLocaleCurrency } = useLocaleCurrency();

  return (
    <div
      className="locale-currency-switcher"
    >
      <button
        type="button"
        className={`locale-currency-option${currency === 'VND' ? ' is-selected' : ''}`}
        aria-pressed={currency === 'VND'}
        onClick={() => { playClickSound(); setLocaleCurrency('vi', 'VND'); }}
      >
        VNĐ
      </button>

      <button
        type="button"
        className={`locale-currency-option${currency === 'SGD' ? ' is-selected' : ''}`}
        aria-pressed={currency === 'SGD'}
        onClick={() => { playClickSound(); setLocaleCurrency('en', 'SGD'); }}
      >
        SGD
      </button>

      <button
        type="button"
        className={`locale-currency-option${currency === 'USD' ? ' is-selected' : ''}`}
        aria-pressed={currency === 'USD'}
        onClick={() => { playClickSound(); setLocaleCurrency('en', 'USD'); }}
      >
        USD
      </button>
    </div>
  );
}