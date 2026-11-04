'use client';

import { ShieldCheck } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function TasteGuarantee() {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';

  return (
    <aside className="taste-guarantee" aria-label={isEN ? 'Taste guarantee' : 'Bảo chứng vị giác'}>
      <span className="taste-guarantee-icon"><ShieldCheck size={22} aria-hidden="true" /></span>
      <div><strong>{isEN ? '100% TASTE GUARANTEE · ZERO RISK' : 'BẢO HIỂM VỊ GIÁC 100% · KHÔNG RỦI RO'}</strong><p>{isEN ? 'If the first pack does not suit your taste, contact us within 24 hours. We will refund 100% or send a different flavor; no return of the original product is required.' : 'Nếu quý khách ăn thử gói đầu tiên không hợp khẩu vị Mắc Khén Tây Bắc, chúng tôi hoàn tiền 100% hoặc gửi bù vị khác trong 24h mà không yêu cầu gửi trả lại sản phẩm cũ.'}</p></div>
    </aside>
  );
}