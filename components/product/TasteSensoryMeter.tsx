'use client';

import { getSensoryProfile } from '@/lib/sensory-profile';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function TasteSensoryMeter({ name, slug, compact = false }: { name: string; slug?: string; compact?: boolean }) {
  const profile = getSensoryProfile(name, slug);
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  if (!profile) return null;

  return (
    <div className={`taste-sensory-meter${compact ? ' is-compact' : ''}`} aria-label={isEN ? 'Taste and sensory profile' : 'Chỉ số cảm quan vị giác'}>
      {profile.metrics.map((metric) => (
        <div className="taste-sensory-metric" key={metric.labelEn}>
          <span className="taste-sensory-label">{metric.icon} {isEN ? metric.labelEn : metric.labelVi}</span>
          <span className="taste-sensory-dots" role="img" aria-label={`${metric.value}/5`}>
            {Array.from({ length: 5 }, (_, index) => <i className={index < metric.value ? 'is-filled' : ''} key={index} aria-hidden="true" />)}
          </span>
        </div>
      ))}
    </div>
  );
}