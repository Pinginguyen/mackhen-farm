'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';

export default function LocalizedProductName({ name }: { name: string }) {
  const { translateProductName } = useLocaleCurrency();
  return translateProductName(name);
}