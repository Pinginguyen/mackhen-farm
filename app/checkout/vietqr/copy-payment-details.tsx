'use client';

import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function CopyPaymentDetails({ accountNumber, transferContent }: { accountNumber: string; transferContent: string }) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast('');
      sonnerToast.success(isEN ? 'Copied to clipboard' : 'Đã sao chép vào bộ nhớ tạm');
    } catch {
      setToast(isEN ? 'Your browser blocked clipboard access. Please select and copy the details manually.' : 'Trình duyệt không cho phép sao chép. Vui lòng chọn và sao chép thủ công.');
    }
  }

  return <div className="payment-copy-actions"><button className="secondary-action micro-tactile" type="button" onClick={() => copy('số tài khoản', accountNumber)}><Copy size={16} /> {isEN ? 'Copy account number' : 'Sao chép số tài khoản'}</button><button className="secondary-action micro-tactile" type="button" onClick={() => copy('nội dung chuyển khoản', transferContent)}><Copy size={16} /> {isEN ? 'Copy transfer reference' : 'Sao chép nội dung chuyển khoản'}</button>{toast && <p className="copy-toast" role="status">{toast}</p>}</div>;
}