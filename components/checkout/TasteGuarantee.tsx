'use client';

import { ShieldCheck } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function TasteGuarantee({ text }: { text: string }) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';

  return (
    <aside className="taste-guarantee" aria-label={isEN ? 'Taste guarantee' : 'Bảo chứng vị giác'}>
      <span className="taste-guarantee-icon"><ShieldCheck size={22} aria-hidden="true" /></span>
      <div><strong>{isEN ? '100% TASTE GUARANTEE · ZERO RISK' : 'BẢO HIỂM VỊ GIÁC 100% · KHÔNG RỦI RO'}</strong><p>{text}</p></div>
    </aside>
  );
}