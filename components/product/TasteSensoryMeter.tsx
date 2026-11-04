'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { normalizeSensoryScores } from '@/lib/sensory-profile';

export default function TasteSensoryMeter({ compact = false, spiciness, chewiness, aroma }: { compact?: boolean; spiciness?: number; chewiness?: number; aroma?: number }) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const scores = normalizeSensoryScores({ spiciness, chewiness, aroma });
  if (!scores) return null;
  const metrics = [
    { icon: '🌶️', labelVi: 'Độ cay', labelEn: 'Spiciness', value: scores.spiciness },
    { icon: '🥩', labelVi: 'Độ dai giòn', labelEn: 'Texture', value: scores.chewiness },
    { icon: '🌿', labelVi: 'Hương Mắc Khén', labelEn: 'Aroma', value: scores.aroma },
  ];

  return (
    <div className={`taste-sensory-meter${compact ? ' is-compact' : ''}`} aria-label={isEN ? 'Taste and sensory profile' : 'Chỉ số cảm quan vị giác'}>
      {metrics.map((metric) => (
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