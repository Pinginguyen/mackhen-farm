'use client';

import { useEffect, useRef, useState } from 'react';

export default function LocaleCurrencySwitcher() {
  const [notice, setNotice] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(false), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  return (
    <div className="header-locale-wrap">
      <details className="header-locale-switcher" ref={menuRef}>
        <summary aria-label="Chọn ngôn ngữ và tiền tệ">🇻🇳 VNĐ</summary>
        <div className="header-locale-dropdown">
          <button type="button" onClick={() => { menuRef.current?.removeAttribute('open'); setNotice(true); }}>🇸🇬 SGD (Singapore)</button>
        </div>
      </details>
      {notice && <p className="header-locale-toast" role="status">Tính năng Đa ngôn ngữ (EN) và Tiền tệ (SGD) đang trong Giai đoạn 2 (Singapore Pilot). Vui lòng trải nghiệm phiên bản nội địa.</p>}
    </div>
  );
}