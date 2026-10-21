'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function LocalizedHeroImage() {
  const { locale } = useLocaleCurrency();
  return <img className={locale === 'en' ? 'hero-image-english' : undefined} src="/products/xe-soi.jpg" alt={translateContent('Món ăn vặt khô và gia vị Tây Bắc', locale)} />;
}