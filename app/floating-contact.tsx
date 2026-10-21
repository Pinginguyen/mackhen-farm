'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function FloatingContact() {
  const pathname = usePathname();
  const { locale } = useLocaleCurrency();
  const contactLabel = translateContent('Chat Zalo với Quản lý: 0762.793.244', locale);
  if (pathname?.startsWith('/admin')) return null;

  return (
    <a className="floating-zalo" href="https://zalo.me/0762793244" aria-label={contactLabel} target="_blank" rel="noopener noreferrer">
      <span className="floating-zalo-mark" aria-hidden="true"><MessageCircle size={24} /><b>Z</b></span>
      <span className="floating-zalo-tooltip">{contactLabel}</span>
    </a>
  );
}