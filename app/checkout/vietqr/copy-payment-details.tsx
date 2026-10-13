'use client';

import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';

export default function CopyPaymentDetails({ accountNumber, transferContent }: { accountNumber: string; transferContent: string }) {
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(`Đã sao chép ${label}.`);
    } catch {
      setToast('Trình duyệt không cho phép sao chép. Vui lòng chọn và sao chép thủ công.');
    }
  }

  return <div className="payment-copy-actions"><button className="secondary-action" type="button" onClick={() => copy('số tài khoản', accountNumber)}><Copy size={16} /> Sao chép số tài khoản</button><button className="secondary-action" type="button" onClick={() => copy('nội dung chuyển khoản', transferContent)}><Copy size={16} /> Sao chép nội dung chuyển khoản</button>{toast && <p className="copy-toast" role="status">{toast}</p>}</div>;
}