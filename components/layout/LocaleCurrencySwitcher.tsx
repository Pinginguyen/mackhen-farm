'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';

export default function LocaleCurrencySwitcher() {
  const { locale, setLocaleCurrency } = useLocaleCurrency();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#f5f5f4',
        padding: '3px',
        borderRadius: '9999px',
        border: '1px solid #e7e5e4',
      }}
    >
      {/* Nút VNĐ */}
      <button
        type="button"
        onClick={() => setLocaleCurrency('vi', 'VND')}
        style={{
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          backgroundColor: locale === 'vi' ? '#9B2424' : 'transparent',
          color: locale === 'vi' ? '#ffffff' : '#57534e',
          boxShadow: locale === 'vi' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        VNĐ
      </button>

      {/* Nút SGD */}
      <button
        type="button"
        onClick={() => setLocaleCurrency('en', 'SGD')}
        style={{
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          backgroundColor: locale === 'en' ? '#9B2424' : 'transparent',
          color: locale === 'en' ? '#ffffff' : '#57534e',
          boxShadow: locale === 'en' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        SGD
      </button>
    </div>
  );
}