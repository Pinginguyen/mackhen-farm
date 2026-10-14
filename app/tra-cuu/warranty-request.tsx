'use client';

import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';

const reasons = ['Hở túi', 'Ỉu mốc', 'Đổi khẩu vị'];

export default function WarrantyRequest({ orderCode, phone, deliveredAt, existingReason }: { orderCode: string; phone: string; deliveredAt: string | null; existingReason?: string | null }) {
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
        setMessage(getErrorMessage(result?.error ?? result, 'Không thể gửi yêu cầu lúc này.'));
        return;
      }
      setMessage(result.alreadyRequested ? 'Đơn này đã có yêu cầu bảo hành.' : 'Đã ghi nhận. Xưởng sẽ gửi bù gói mới miễn phí trong 24 giờ.');
      if (!result.alreadyRequested) setOpen(false);
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  if (existingReason) return <p className="warranty-requested" role="status"><ShieldCheck size={17} /> Đã gửi yêu cầu bảo hành: {existingReason}</p>;
  if (!phone || !withinWindow) return null;

  return (
    <div className="warranty-request-wrap">
      <button className="warranty-request-button" type="button" onClick={() => setOpen(true)}><ShieldCheck size={17} /> Yêu cầu Bảo hành vị giác 24h</button>
      {message && <p className="warranty-requested" role="status">{message}</p>}
      {open && <div className="warranty-modal-backdrop" onClick={() => setOpen(false)}>
        <section className="warranty-modal" role="dialog" aria-modal="true" aria-labelledby={`warranty-title-${orderCode}`} onClick={(event) => event.stopPropagation()}>
          <header><div><p className="eyebrow">Đơn {orderCode}</p><h2 id={`warranty-title-${orderCode}`}>Bảo hành vị giác 24h</h2></div><button type="button" aria-label="Đóng" onClick={() => setOpen(false)}><X size={18} /></button></header>
          <p>Chọn lý do cần hỗ trợ. Xưởng sẽ liên hệ và gửi bù gói mới miễn phí trong 24 giờ.</p>
          <form onSubmit={submit}>
            <fieldset><legend>Lý do yêu cầu</legend>{reasons.map((item) => <label key={item}><input type="radio" name="reason" checked={reason === item} onChange={() => setReason(item)} />{item}</label>)}</fieldset>
            <div className="warranty-modal-actions"><button className="secondary-action" type="button" onClick={() => setOpen(false)}>Để sau</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi yêu cầu'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}