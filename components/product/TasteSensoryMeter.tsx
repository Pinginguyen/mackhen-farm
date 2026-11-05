'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { normalizeSensoryScores } from '@/lib/sensory-profile';

export default function TasteSensoryMeter({ compact = false, spiciness, chewiness, aroma }: { compact?: boolean; spiciness?: number; chewiness?: number; aroma?: number }) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const scores = normalizeSensoryScores({ spiciness, chewiness, aroma });
  if (!scores) return null;
  const metrics = [
    { icon: '🌶️', labelVi: 'Độ cay', compactLabelVi: 'Độ cay', labelEn: 'Spiciness', value: scores.spiciness },
    { icon: '🥩', labelVi: 'Độ dai giòn', compactLabelVi: 'Độ dai giòn', labelEn: 'Texture', value: scores.chewiness },
    { icon: '🌿', labelVi: 'Hương Mắc Khén', compactLabelVi: 'Hương Mắc Khén', labelEn: 'Aroma', value: scores.aroma },
  ];

  return (
    <div className={`taste-sensory-meter !rounded-2xl !border-[#eadfd2] !bg-gradient-to-br !from-[#fffdf9] !to-[#f8f2e9] !p-4${compact ? ' is-compact' : ''}`} aria-label={isEN ? 'Taste and sensory profile' : 'Chỉ số cảm quan vị giác'}>
      {metrics.map((metric) => (
        <div className="taste-sensory-metric !grid !grid-cols-[minmax(0,1fr)_minmax(70px,1.2fr)_38px] !items-center !gap-3" key={metric.labelEn}>
          <span className="taste-sensory-label !max-w-none !text-[#34453b] !font-semibold">{metric.icon} {isEN ? metric.labelEn : compact ? metric.compactLabelVi : metric.labelVi}</span>
          <span className="taste-sensory-track !block !h-1.5 !overflow-hidden !rounded-full !bg-[#e9e2d9]" role="progressbar" aria-label={isEN ? metric.labelEn : metric.labelVi} aria-valuemin={0} aria-valuemax={5} aria-valuenow={metric.value}>
            <span className="taste-sensory-fill !block !h-full !rounded-full !transition-[width] !duration-500" style={{ width: `${metric.value * 20}%`, backgroundImage: 'linear-gradient(to right, #b45309, #841e1e)' }} />
          </span>
          <span className="taste-sensory-percent !text-right !text-xs !font-bold !tabular-nums !text-[#841E1E]" aria-hidden="true">{metric.value * 20}%</span>
        </div>
      ))}
    </div>
  );
}