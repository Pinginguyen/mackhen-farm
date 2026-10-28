const messages = [
  '🌿 100% NGUYÊN LIỆU UPCYCLED',
  '🔥 MẮC KHÉN SAO KHÔ SƠN LA',
  '💪 22G ĐẠM THỰC VẬT',
  '📦 FREESHIP TOÀN QUỐC',
  '🇸🇬 XUẤT KHẨU SINGAPORE PILOT',
  '🌶️ ĐẬM VỊ TÂY BẮC',
];

function MarqueeContent() {
  return (
    <span className="marquee-content" aria-hidden="true">
      {messages.map((message) => <span className="marquee-item" key={message}>{message}<span className="marquee-separator">•</span></span>)}
    </span>
  );
}

export default function MarqueeBanner() {
  return (
    <div className="home-marquee" role="region" aria-label={messages.join(' • ')}>
      <div className="marquee-container">
        <MarqueeContent />
        <MarqueeContent />
      </div>
    </div>
  );
}