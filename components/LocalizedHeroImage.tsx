'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function LocalizedHeroImage({ imageUrl, mobileImageUrl }: { imageUrl: string; mobileImageUrl: string }) {
  const { locale } = useLocaleCurrency();
  return <picture className="hero-image-frame">
    <source media="(max-width: 640px)" srcSet={mobileImageUrl} />
    <img className="hero-image" src={imageUrl} alt={translateContent('Món ăn vặt khô và gia vị Tây Bắc', locale)} />
  </picture>;
}