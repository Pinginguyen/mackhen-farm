'use client';

import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';

const issueTypes = [
  'Giao sai sản phẩm',
  'Bao bì bị rách hoặc xì chân không',
  'Hàng có dấu hiệu ẩm mốc',
  'Khác',
];
const maxEvidenceBytes = 2 * 1024 * 1024;
const evidenceMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export default function ReturnRequestForm() {
  const [saving, setSaving] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerIdRef = useRef(0);

  function selectEvidence(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    setFeedback(null);
    if (!file) return;

    const readerId = ++readerIdRef.current;
    setReadingImage(false);
    setImageUrl(null);
    setImageName('');

    if (!evidenceMimeTypes.has(file.type)) {
      setImageUrl(null);
      setImageName('');
      event.currentTarget.value = '';
      setFeedback({ type: 'error', text: 'Ảnh cần dùng định dạng JPEG, PNG, WebP, GIF hoặc AVIF.' });
      return;
    }

    if (file.size > maxEvidenceBytes) {
      setImageUrl(null);
      setImageName('');
      event.currentTarget.value = '';
      setFeedback({ type: 'error', text: 'Ảnh minh chứng cần có dung lượng tối đa 2MB.' });
      return;
    }

    const reader = new FileReader();
    setReadingImage(true);
    reader.onload = () => {
      if (readerIdRef.current !== readerId) return;
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setImageName(file.name);
      } else {
        setFeedback({ type: 'error', text: 'Không thể đọc ảnh. Vui lòng chọn lại.' });
      }
      setReadingImage(false);
    };
    reader.onerror = () => {
      if (readerIdRef.current !== readerId) return;
      setFeedback({ type: 'error', text: 'Không thể đọc ảnh. Vui lòng chọn lại.' });
      setReadingImage(false);
    };
    reader.onabort = () => {
      if (readerIdRef.current === readerId) setReadingImage(false);
    };
    reader.readAsDataURL(file);
  }

  function removeEvidence() {
    readerIdRef.current += 1;
    setImageUrl(null);
    setImageName('');
    setReadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

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
          imageUrl,
        }),
      });
      const result = await response.json() as { error?: unknown; message?: unknown };

      if (!response.ok) {
        setFeedback({ type: 'error', text: getErrorMessage(result?.error ?? result, 'Không thể gửi yêu cầu lúc này.') });
        return;
      }

      formElement.reset();
      setImageUrl(null);
      setImageName('');
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
          <span className="return-evidence-label">Ảnh minh chứng (nếu có)</span>
          <label className="return-upload-control" htmlFor="return-evidence-file">
            <span className="return-upload-icon"><Upload size={20} aria-hidden="true" /><Camera size={18} aria-hidden="true" /></span>
            <span>{readingImage ? 'Đang đọc ảnh...' : imageName || 'Bấm để tải ảnh minh chứng hoặc chụp ảnh mới'}</span>
            <input
              ref={fileInputRef}
              id="return-evidence-file"
              name="evidence"
              type="file"
              accept="image/*"
              onChange={selectEvidence}
            />
          </label>
          <small className="return-evidence-help">Chọn ảnh từ thiết bị hoặc camera · Tối đa 2MB</small>
          {imageUrl && (
            <div className="return-upload-preview">
              <img src={imageUrl} alt="Xem trước ảnh minh chứng" />
              <button type="button" onClick={removeEvidence} aria-label="Xóa ảnh minh chứng" title="Xóa ảnh">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <button className="return-submit-button" type="submit" disabled={saving || readingImage}>{saving ? 'Đang gửi...' : readingImage ? 'Đang đọc ảnh...' : 'Gửi yêu cầu đổi trả'}</button>
      {feedback && <p className={`return-submit-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    </form>
  );
}