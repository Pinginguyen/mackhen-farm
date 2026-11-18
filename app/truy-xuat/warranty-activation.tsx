'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function WarrantyActivation({ qrToken }: { qrToken: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/tracking/warranty', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode: form.get('orderCode'), phone: form.get('phone'), reason: 'Đổi khẩu vị', qrToken }),
      });
      const result = await response.json() as { message?: string; error?: string; alreadyRequested?: boolean };
      if (!response.ok) throw new Error(result.error ?? 'Không thể kích hoạt bảo hành.');
      setMessage(result.alreadyRequested ? 'Đơn hàng này đã có yêu cầu bảo hành.' : result.message ?? 'Đã kích hoạt bảo hành vị giác 24 giờ.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể kết nối để kích hoạt bảo hành.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="traceability-warranty" aria-labelledby="traceability-warranty-title">
      <div><p className="traceability-kicker">TASTE GUARANTEE · 24 HOURS</p><h3 id="traceability-warranty-title"><ShieldCheck size={18} aria-hidden="true" /> Kích hoạt bảo hiểm vị giác 24h</h3><p>Nếu không hợp khẩu vị, gửi yêu cầu đổi trả miễn phí trong 24 giờ sau khi đơn được giao.</p></div>
      <form className="traceability-warranty-form" onSubmit={activate}>
        <label>Mã đơn hàng<input name="orderCode" placeholder="MKF-123456" pattern="MKF-[0-9]{6}" required /></label>
        <label>Số điện thoại đặt hàng<input name="phone" type="tel" autoComplete="tel" required /></label>
        <button type="submit" disabled={busy}>{busy ? 'Đang xác minh...' : 'Kích hoạt bảo hành'}</button>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}