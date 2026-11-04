'use client';

import { useState } from 'react';
import { BadgeInfo } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

const grades = [
  { grade: 'A', color: 'grade-a' },
  { grade: 'B', color: 'grade-b' },
  { grade: 'C', color: 'grade-c' },
  { grade: 'D', color: 'grade-d' },
];

export default function NutriGradeBadge() {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const visible = currency === 'SGD' || referenceOpen;

  return (
    <section className="nutri-grade-reference" aria-label={isEN ? 'Singapore Nutri-Grade reference' : 'Tham khảo Nutri-Grade Singapore'}>
      {currency !== 'SGD' && <button className="nutri-grade-toggle" type="button" aria-expanded={referenceOpen} onClick={() => setReferenceOpen((open) => !open)}><BadgeInfo size={15} aria-hidden="true" />{referenceOpen ? (isEN ? 'Hide Singapore reference' : 'Ẩn tham khảo Singapore') : (isEN ? 'Singapore nutrition reference' : 'Tham khảo nhãn Singapore')}</button>}
      {visible && <div className="nutri-grade-card">
        <div className="nutri-grade-title"><div><p className="b2b-section-kicker">SINGAPORE · NUTRI-GRADE</p><strong>{isEN ? 'Reference scale' : 'Thang phân hạng tham khảo'}</strong></div><span className="nutri-grade-unrated">{isEN ? 'Not assessed' : 'Chưa đánh giá'}</span></div>
        <div className="nutri-grade-scale" aria-label={isEN ? 'A to D reference scale, no grade assigned' : 'Thang tham khảo A đến D, chưa gán hạng'}>{grades.map(({ grade, color }) => <span className={`nutri-grade-cell ${color}`} key={grade}>{grade}</span>)}</div>
        <p>{isEN ? 'This is a solid food, not a beverage assessed under Singapore’s Nutri-Grade scheme. No A–D grade is assigned. Verify applicable Singapore food labelling requirements and nutrient data before export.' : 'Đây là thực phẩm khô, không phải đồ uống được đánh giá theo thang Nutri-Grade Singapore. Sản phẩm chưa được gán hạng A–D. Cần xác minh quy định nhãn thực phẩm Singapore và dữ liệu dinh dưỡng trước khi xuất khẩu.'}</p>
      </div>}
    </section>
  );
}