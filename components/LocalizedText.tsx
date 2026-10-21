'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function LocalizedText({ text }: { text: string }) {
  const { locale } = useLocaleCurrency();
  return translateContent(text, locale);
}