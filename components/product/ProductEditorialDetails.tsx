import Link from 'next/link';
import { MapPin, Stamp, Utensils, Wine } from 'lucide-react';
import type { PairingGuide, SensoryProfile } from '@/lib/store-data';

const sensoryLabels: { key: keyof SensoryProfile; label: string }[] = [
  { key: 'spicy', label: 'Cay tê Mắc Khén' },
  { key: 'smoky', label: 'Hương khói củi' },
  { key: 'chewiness', label: 'Độ dai thớ thịt' },
  { key: 'crispness', label: 'Độ giòn' },
  { key: 'sweetAftertaste', label: 'Hậu vị ngọt' },
];

export default function ProductEditorialDetails({
  sensoryProfile,
  pairingGuide,
  originRegion,
  batchCode,
}: {
  sensoryProfile?: SensoryProfile | null;
  pairingGuide?: PairingGuide | null;
  originRegion?: string | null;
  batchCode?: string | null;
}) {
  const hasPairing = Boolean(pairingGuide?.recommendedDrink?.trim() || pairingGuide?.servingTip?.trim());
  const hasSeal = Boolean(batchCode?.trim());

  return <div className="product-editorial-details">
    {sensoryProfile && <section className="product-info-block product-sensory-panel" aria-labelledby="product-sensory-title">
      <p className="eyebrow">TASTING NOTES · 5 GIÁC QUAN</p>
      <h2 id="product-sensory-title">Hồ sơ cảm quan</h2>
      <div className="product-sensory-bars">{sensoryLabels.map(({ key, label }) => {
        const score = Math.max(1, Math.min(5, sensoryProfile[key]));
        return <div className="product-sensory-row" key={key}>
          <span>{label}</span>
          <div className="product-sensory-track" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={5} aria-valuenow={score}>
            <span style={{ width: `${score * 20}%` }} />
          </div>
          <strong className="product-sensory-score">{score}/5</strong>
        </div>;
      })}</div>
    </section>}

    {hasPairing && <section className="product-pairing-guide" aria-labelledby="product-pairing-title">
      <h2 id="product-pairing-title"><Utensils size={18} aria-hidden="true" /> Cẩm nang kết hợp ẩm thực</h2>
      {pairingGuide?.recommendedDrink?.trim() && <p><Wine size={16} aria-hidden="true" /> <strong>Đồ uống gợi ý:</strong> {pairingGuide.recommendedDrink}</p>}
      {pairingGuide?.servingTip?.trim() && <p><strong>Mẹo thưởng thức:</strong> {pairingGuide.servingTip}</p>}
    </section>}

    {hasSeal && <Link className="vintage-wax-seal" href={`/truy-xuat?batch=${encodeURIComponent(batchCode!.trim())}`} aria-label={`Tra cứu nguồn gốc sản phẩm theo lô ${batchCode!.trim()}`} title="Tra cứu hành trình lô sản xuất">
      <Stamp size={21} strokeWidth={1.5} aria-hidden="true" />
      <small>MÃ NIÊM PHONG</small>
      <strong>{batchCode!.trim()}</strong>
      {originRegion?.trim() && <span><MapPin size={11} aria-hidden="true" /> {originRegion}</span>}
      <span>100% NGUYÊN LIỆU UPCYCLED</span>
    </Link>}
  </div>;
}