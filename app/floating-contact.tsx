'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function FloatingContact() {
  const pathname = usePathname();
  const { locale } = useLocaleCurrency();
  const [contact, setContact] = useState({ hotline: '0762.793.244', zalo: 'https://zalo.me/0762793244' });

  useEffect(() => {
    let active = true;
    fetch('/api/public/settings')
      .then((response) => response.ok ? response.json() as Promise<{ settings?: { contactHotline?: string; contactZalo?: string } }> : null)
      .then((result) => {
        if (!active || !result?.settings) return;
        setContact({
          hotline: result.settings.contactHotline || '0762.793.244',
          zalo: result.settings.contactZalo || 'https://zalo.me/0762793244',
        });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const contactLabel = translateContent(`Chat Zalo với Quản lý: ${contact.hotline}`, locale);
  const zaloUrl = /^https?:\/\//i.test(contact.zalo) ? contact.zalo : `https://zalo.me/${contact.zalo.replace(/\D/g, '')}`;
  if (pathname?.startsWith('/admin')) return null;

  return (
    <a className="floating-zalo" href={zaloUrl} aria-label={contactLabel} target="_blank" rel="noopener noreferrer">
      <span className="floating-zalo-mark" aria-hidden="true"><MessageCircle size={24} /><b>Z</b></span>
      <span className="floating-zalo-tooltip">{contactLabel}</span>
    </a>
  );
}