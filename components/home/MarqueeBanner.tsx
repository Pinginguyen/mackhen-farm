'use client';

function MarqueeContent({ text, duplicate = false }: { text: string; duplicate?: boolean }) {
  return (
    <span className="marquee-content" aria-hidden={duplicate}>
      <span className="marquee-item text-[#FAF7F2] text-xs md:text-sm font-medium tracking-widest">
          <span className="marquee-separator text-[#D4A373] text-xs mx-4" aria-hidden="true">✦</span>
          {text}
      </span>
    </span>
  );
}

export default function MarqueeBanner({ text, enabled }: { text: string; enabled: boolean }) {
  if (!enabled || !text.trim()) return null;

  return (
    <div
      className="home-marquee w-full overflow-hidden bg-gradient-to-r from-[#142820] via-[#841E1E] to-[#142820] !py-2.5 shadow-md"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
      role="region"
      aria-label="Thông điệp thương hiệu Mắc Khén Farm"
    >
      <div className="marquee-container" aria-label={text}>
        <MarqueeContent text={text} />
        <MarqueeContent text={text} duplicate />
      </div>
    </div>
  );
}
