'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { normalizeAffiliateCode, storeAffiliateCode } from '@/lib/affiliate-attribution';

export default function AffiliateTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [notice, setNotice] = useState('');
  const trackedCode = useRef<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith('/admin') || !ref) {
      setNotice('');
      return;
    }
    const code = normalizeAffiliateCode(ref);
    if (!code || !storeAffiliateCode(code)) {
      setNotice('');
      return;
    }

    if (trackedCode.current !== code) {
      trackedCode.current = code;
      void fetch('/api/affiliate/click', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ affiliateCode: code }),
        keepalive: true,
      }).catch(() => undefined);
    }

    setNotice(code);
    const timeout = window.setTimeout(() => setNotice(''), 6500);
    return () => window.clearTimeout(timeout);
  }, [pathname, ref]);

  if (!notice || pathname.startsWith('/admin')) return null;
  return <div className="affiliate-attribution-notice" role="status">🎉 Bạn đang nhận ưu đãi đặc quyền qua liên kết của đối tác {notice}!</div>;
}