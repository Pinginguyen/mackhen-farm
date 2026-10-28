'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function LocalizedText({ text }: { text: string }) {
  const { locale, currency } = useLocaleCurrency();
  return translateContent(text, locale === 'en' || currency === 'SGD' ? 'en' : 'vi');
}