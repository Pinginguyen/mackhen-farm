'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { formatCurrency as formatAmount, translations } from './translations';
import type { Currency, Locale, TranslationKey } from './translations';
import { translateProductName } from './translations';

type LocaleCurrencyContextValue = {
  locale: Locale;
  currency: Currency;
  setLocaleCurrency: (locale: Locale, currency: Currency) => void;
  t: (key: TranslationKey) => string;
  translateProductName: (name: string) => string;
  formatCurrency: (amount: number) => string;
};

const defaultContextValue: LocaleCurrencyContextValue = {
  locale: 'vi',
  currency: 'VND',
  setLocaleCurrency: () => undefined,
  t: (key) => translations.vi[key],
  translateProductName: (name) => translateProductName(name, 'vi'),
  formatCurrency: (amount) => formatAmount(amount, 'VND'),
};

const LocaleCurrencyContext = createContext<LocaleCurrencyContextValue>(defaultContextValue);
const STORAGE_KEY = 'mackhen_locale_currency';

export function LocaleCurrencyProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('vi');
  const [currency, setCurrency] = useState<Currency>('VND');
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as { locale?: unknown; currency?: unknown } | null;
      if (saved?.locale === 'vi' || saved?.locale === 'en') setLocale(saved.locale);
      if (saved?.currency === 'VND' || saved?.currency === 'SGD') setCurrency(saved.currency);
    } catch {
      // Ignore unavailable or malformed local storage.
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ locale, currency }));
    } catch {
      // The current selection still works for this page when storage is unavailable.
    }
  }, [currency, locale, storageReady]);

  const value: LocaleCurrencyContextValue = {
    locale,
    currency,
    setLocaleCurrency: (nextLocale, nextCurrency) => {
      setLocale(nextLocale);
      setCurrency(nextCurrency);
    },
    t: (key) => translations[locale][key],
    translateProductName: (name) => translateProductName(name, locale),
    formatCurrency: (amount) => formatAmount(amount, currency),
  };

  return <LocaleCurrencyContext.Provider value={value}>{children}</LocaleCurrencyContext.Provider>;
}

export function useLocaleCurrency(): LocaleCurrencyContextValue {
  return useContext(LocaleCurrencyContext);
}