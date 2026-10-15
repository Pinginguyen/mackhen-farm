'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function FloatingContact() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <a className="floating-zalo" href="https://zalo.me/0762793244" aria-label="Chat Zalo với Quản lý: 0762.793.244" target="_blank" rel="noopener noreferrer">
      <span className="floating-zalo-mark" aria-hidden="true"><MessageCircle size={24} /><b>Z</b></span>
      <span className="floating-zalo-tooltip">Chat Zalo với Quản lý: 0762.793.244</span>
    </a>
  );
}