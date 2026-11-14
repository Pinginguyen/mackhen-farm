'use client';

function MarqueeTrack({ messages, duplicate = false }: { messages: string[]; duplicate?: boolean }) {
  return (
    <div className="marquee-track" aria-hidden={duplicate}>
      {Array.from({ length: 6 }, (_, copy) => messages.map((message, index) => (
        <span className="marquee-item" key={`${copy}-${index}`}>
          {copy > 0 || index > 0 ? <span className="marquee-separator" aria-hidden="true">✦</span> : null}
          <span>{message}</span>
        </span>
      )))}
    </div>
  );
}

export default function MarqueeBanner({ text, enabled }: { text: string; enabled: boolean }) {
  if (!enabled || !text.trim()) return null;
  const messages = text.split(/[|•]/).map((message) => message.trim()).filter(Boolean);
  if (!messages.length) return null;

  return (
    <div
      className="home-marquee w-full overflow-hidden shadow-md"
      role="region"
      aria-label="Thông điệp thương hiệu Mắc Khén Farm"
    >
      <div className="marquee-viewport" aria-label={text}>
        <div className="marquee-container">
          <MarqueeTrack messages={messages} />
          <MarqueeTrack messages={messages} duplicate />
        </div>
      </div>
    </div>
  );
}
