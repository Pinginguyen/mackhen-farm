'use client';

import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

const reasons = ['Hở túi', 'Ỉu mốc', 'Đổi khẩu vị'];

export default function WarrantyRequest({ orderCode, phone, deliveredAt, existingReason }: { orderCode: string; phone: string; deliveredAt: string | null; existingReason?: string | null }) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const text = (value: string) => translateContent(value, isEN ? 'en' : 'vi');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const deliveryTime = deliveredAt ? Date.parse(deliveredAt) : Number.NaN;
  const withinWindow = Number.isFinite(deliveryTime) && Date.now() - deliveryTime <= 24 * 60 * 60 * 1000;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/tracking/warranty', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode, phone, reason }),
      });
      const result = await response.json() as { error?: unknown; alreadyRequested?: boolean };
      if (!response.ok) {
        setMessage(isEN ? text('Không thể gửi yêu cầu lúc này.') : getErrorMessage(result?.error ?? result, 'Không thể gửi yêu cầu lúc này.'));
        return;
      }
      setMessage(result.alreadyRequested ? text('Đã gửi yêu cầu bảo hành.') : text('Đã ghi nhận. Xưởng sẽ gửi bù gói mới miễn phí trong 24 giờ.'));
      if (!result.alreadyRequested) setOpen(false);
    } catch {
      setMessage(text('Không thể kết nối. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  }

  if (existingReason) return <p className="warranty-requested" role="status"><ShieldCheck size={17} /> {text('Đã gửi yêu cầu bảo hành:')} {text(existingReason)}</p>;
  if (!phone || !withinWindow) return null;

  return (
    <div className="warranty-request-wrap">
      <button className="warranty-request-button" type="button" onClick={() => setOpen(true)}><ShieldCheck size={17} /> {text('Yêu cầu Bảo hành vị giác 24h')}</button>
      {message && <p className="warranty-requested" role="status">{message}</p>}
      {open && <div className="warranty-modal-backdrop" onClick={() => setOpen(false)}>
        <section className="warranty-modal" role="dialog" aria-modal="true" aria-labelledby={`warranty-title-${orderCode}`} onClick={(event) => event.stopPropagation()}>
          <header><div><p className="eyebrow">{isEN ? 'Order' : 'Đơn'} {orderCode}</p><h2 id={`warranty-title-${orderCode}`}>{text('Bảo hành vị giác 24h')}</h2></div><button type="button" aria-label={text('Đóng')} onClick={() => setOpen(false)}><X size={18} /></button></header>
          <p>{text('Chọn lý do cần hỗ trợ. Xưởng sẽ liên hệ và gửi bù gói mới miễn phí trong 24 giờ.')}</p>
          <form onSubmit={submit}>
            <fieldset><legend>{text('Lý do yêu cầu')}</legend>{reasons.map((item) => <label key={item}><input type="radio" name="reason" checked={reason === item} onChange={() => setReason(item)} />{text(item)}</label>)}</fieldset>
            <div className="warranty-modal-actions"><button className="secondary-action" type="button" onClick={() => setOpen(false)}>{text('Để sau')}</button><button className="primary-action" type="submit" disabled={saving}>{saving ? text('Đang gửi...') : text('Gửi yêu cầu')}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}