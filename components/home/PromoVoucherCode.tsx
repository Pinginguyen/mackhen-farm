'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const voucherCode = 'NHIEUXANH20';

export default function PromoVoucherCode() {
  const [copied, setCopied] = useState(false);

  async function copyVoucherCode() {
    try {
      await navigator.clipboard.writeText(voucherCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="promo-voucher-code" type="button" onClick={copyVoucherCode} aria-label="Sao chép mã NHIEUXANH20">
      <span>{voucherCode}</span>
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span className="promo-voucher-feedback" aria-live="polite">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
    </button>
  );
}
