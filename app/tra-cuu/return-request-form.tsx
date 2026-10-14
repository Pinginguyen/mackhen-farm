'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/lib/error-message';

const issueTypes = [
  'Giao sai sản phẩm',
  'Bao bì bị rách hoặc xì chân không',
  'Hàng có dấu hiệu ẩm mốc',
  'Khác',
];

export default function ReturnRequestForm() {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderCode: form.get('orderCode'),
          customerPhone: form.get('phone'),
          issueType: form.get('issue'),
          description: form.get('description'),
          imageUrl: form.get('evidenceLink') || null,
        }),
      });
      const result = await response.json() as { error?: unknown; message?: unknown };

      if (!response.ok) {
        setFeedback({ type: 'error', text: getErrorMessage(result?.error ?? result, 'Không thể gửi yêu cầu lúc này.') });
        return;
      }

      formElement.reset();
      setFeedback({ type: 'success', text: 'Đã tiếp nhận yêu cầu! Đội ngũ CSKH sẽ liên hệ hỗ trợ bạn trong vòng 30 phút' });
    } catch {
      setFeedback({ type: 'error', text: 'Không thể kết nối. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="return-request-form" className="return-request-form" onSubmit={submitRequest} onChange={() => setFeedback(null)}>
      <div className="return-form-grid">
        <div className="return-form-field">
          <label htmlFor="return-order-code">Mã đơn hàng <span aria-hidden="true">*</span></label>
          <input id="return-order-code" name="orderCode" placeholder="MKF-XXXX" required />
        </div>

        <div className="return-form-field">
          <label htmlFor="return-phone">Số điện thoại đặt hàng <span aria-hidden="true">*</span></label>
          <input id="return-phone" name="phone" type="tel" autoComplete="tel" placeholder="Nhập số điện thoại đặt hàng" required />
        </div>

        <div className="return-form-field">
          <label htmlFor="return-issue">Phân loại sự cố <span aria-hidden="true">*</span></label>
          <select id="return-issue" name="issue" defaultValue="" required>
            <option value="" disabled>Chọn tình trạng cần hỗ trợ</option>
            {issueTypes.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
          </select>
        </div>

        <div className="return-form-field return-form-full-width">
          <label htmlFor="return-description">Mô tả chi tiết <span aria-hidden="true">*</span></label>
          <textarea id="return-description" name="description" rows={4} placeholder="Mô tả tình trạng bạn gặp phải..." required />
        </div>

        <div className="return-form-field return-form-full-width">
          <label htmlFor="return-evidence-link">Link ảnh minh chứng (nếu có)</label>
          <input id="return-evidence-link" name="evidenceLink" type="url" placeholder="https://..." />
          <small className="return-evidence-help">Dán liên kết ảnh công khai để đội ngũ có thể xem minh chứng.</small>
        </div>
      </div>

      <button className="return-submit-button" type="submit" disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi yêu cầu đổi trả'}</button>
      {feedback && <p className={`return-submit-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    </form>
  );
}