'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';
import { normalizeSensoryScores } from '@/lib/sensory-profile';

type TasteSensoryMeterProps = {
  compact?: boolean;
  spiciness?: number;
  chewiness?: number;
  aroma?: number;
  labelAxis1?: string;
  labelAxis2?: string;
  labelAxis3?: string;
  valueAxis1?: number;
  valueAxis2?: number;
  valueAxis3?: number;
};

export default function TasteSensoryMeter({
  compact = false,
  spiciness,
  chewiness,
  aroma,
  labelAxis1,
  labelAxis2,
  labelAxis3,
  valueAxis1,
  valueAxis2,
  valueAxis3,
}: TasteSensoryMeterProps) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const legacyScores = normalizeSensoryScores({ spiciness, chewiness, aroma });
  const axisValues = [valueAxis1, valueAxis2, valueAxis3];
  const fallbackValues = legacyScores
    ? [legacyScores.spiciness * 20, legacyScores.chewiness * 20, legacyScores.aroma * 20]
    : [60, 80, 100];
  const values = axisValues.map((value, index) => Number.isInteger(value) && value! >= 0 && value! <= 100
    ? value
    : fallbackValues[index]);
  const metrics = [
    { icon: '🌶️', labelVi: labelAxis1?.trim() || 'Độ cay', labelEn: labelAxis1?.trim() === 'Độ cay' || !labelAxis1?.trim() ? 'Spiciness' : labelAxis1.trim(), value: values[0]! },
    { icon: '🥩', labelVi: labelAxis2?.trim() || 'Độ dai giòn', labelEn: labelAxis2?.trim() === 'Độ dai giòn' || !labelAxis2?.trim() ? 'Texture' : labelAxis2.trim(), value: values[1]! },
    { icon: '🌿', labelVi: labelAxis3?.trim() || 'Hương Mắc Khén', labelEn: labelAxis3?.trim() === 'Hương Mắc Khén' || !labelAxis3?.trim() ? 'Aroma' : labelAxis3.trim(), value: values[2]! },
  ];

  return (
    <div className={`taste-sensory-meter !rounded-2xl !border-[#eadfd2] !bg-gradient-to-br !from-[#fffdf9] !to-[#f8f2e9] !p-4${compact ? ' is-compact' : ''}`} aria-label={isEN ? 'Taste and sensory profile' : 'Chỉ số cảm quan vị giác'}>
      {metrics.map((metric) => (
        <div className="taste-sensory-metric !grid !grid-cols-[minmax(0,1fr)_minmax(70px,1.2fr)_38px] !items-center !gap-3" key={metric.labelEn}>
          <span className="taste-sensory-label !max-w-none !text-[#34453b] !font-semibold">{metric.icon} {isEN ? metric.labelEn : compact ? metric.labelVi : metric.labelVi}</span>
          <span className="taste-sensory-track !block !h-1.5 !overflow-hidden !rounded-full !bg-[#e9e2d9]" role="progressbar" aria-label={metric.labelVi} aria-valuemin={0} aria-valuemax={100} aria-valuenow={metric.value}>
            <span className="taste-sensory-fill !block !h-full !rounded-full !transition-[width] !duration-500" style={{ width: `${metric.value}%`, backgroundImage: 'linear-gradient(to right, #b45309, #841e1e)' }} />
          </span>
          <span className="taste-sensory-percent !text-right !text-xs !font-bold !tabular-nums !text-[#841E1E]" aria-hidden="true">{metric.value}%</span>
        </div>
      ))}
    </div>
  );
}