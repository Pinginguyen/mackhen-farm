'use client';

import Link from 'next/link';
import { useLocaleCurrency } from '@/lib/i18n-context';

type MarqueeMessage = { text: string; href?: string };

function MarqueeContent({ messages, duplicate = false }: { messages: MarqueeMessage[]; duplicate?: boolean }) {
  return (
    <span className="marquee-content" aria-hidden={duplicate}>
      {messages.map((message) => (
        <span className="marquee-item text-[#FDFBF7] text-xs md:text-sm font-medium tracking-widest" key={message.text}>
          <span className="marquee-separator text-amber-300 text-xs mx-4" aria-hidden="true">✦</span>
          {message.href
            ? <Link className="transition-colors hover:text-amber-200 hover:underline" href={message.href} tabIndex={duplicate ? -1 : undefined}>{message.text}</Link>
            : <span>{message.text}</span>}
        </span>
      ))}
    </span>
  );
}

export default function MarqueeBanner() {
  const { currency } = useLocaleCurrency();
  const isEN = currency === 'SGD';
  const messages: MarqueeMessage[] = isEN ? [
    { text: '100% UPCYCLED SOYBEAN', href: '/truy-xuat' },
    { text: 'WILD SICHUAN PEPPER (MẮC KHÉN)' },
    { text: '22G HIGH PLANT PROTEIN' },
    { text: 'FREE SHIPPING FROM 250K', href: '/khuyen-mai' },
    { text: 'SINGAPORE EXPORT PILOT', href: '/hop-tac-b2b' },
    { text: 'AUTHENTIC NORTHWEST FLAVOR' },
  ] : [
    { text: '100% NGUYÊN LIỆU UPCYCLED', href: '/truy-xuat' },
    { text: 'MẮC KHÉN SAO KHÔ SƠN LA' },
    { text: '22G ĐẠM THỰC VẬT / 100G' },
    { text: 'FREESHIP TOÀN QUỐC TỪ 250K', href: '/khuyen-mai' },
    { text: 'XUẤT KHẨU SINGAPORE PILOT', href: '/hop-tac-b2b' },
    { text: 'ĐẬM VỊ NÚI RỪNG TÂY BẮC' },
  ];

  return (
    <div
      className="home-marquee w-full overflow-hidden bg-gradient-to-r from-[#7A1C1C] via-[#9B2424] to-[#7A1C1C] !py-2.5 shadow-md"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
      role="region"
      aria-label="Thông điệp thương hiệu Mắc Khén Farm"
    >
      <div className="marquee-container">
        <MarqueeContent messages={messages} />
        <MarqueeContent messages={messages} duplicate />
      </div>
    </div>
  );
}
