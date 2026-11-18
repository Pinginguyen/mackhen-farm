'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';

export default function ReferralShareCard({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const [referralUrl, setReferralUrl] = useState(`/?referral=${encodeURIComponent(referralCode)}`);

  useEffect(() => {
    setReferralUrl(`${window.location.origin}/?referral=${encodeURIComponent(referralCode)}`);
  }, [referralCode]);

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="referral-share-card" aria-labelledby="referral-share-title">
      <p className="eyebrow"><Gift size={15} aria-hidden="true" /> Mời bạn bè</p>
      <h2 id="referral-share-title">Chia sẻ mã, nhận 100 điểm thưởng</h2>
      <p>Bạn nhận điểm khi bạn bè dùng mã này đặt đơn và đơn được giao thành công.</p>
      <div className="referral-share-actions">
        <code>{referralCode}</code>
        <button type="button" className="secondary-action" onClick={() => void copyReferralLink()}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
        </button>
      </div>
      {copied && <span className="sr-only" role="status">Đã sao chép liên kết giới thiệu.</span>}
    </section>
  );
}