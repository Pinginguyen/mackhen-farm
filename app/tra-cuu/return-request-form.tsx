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
  const [isRefundRequested, setIsRefundRequested] = useState(false);
  const [bankName, setBankName] = useState('');
  const [otherBankName, setOtherBankName] = useState('');
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
          refundBankName: bankName === 'OTHER' ? otherBankName.trim() : bankName,
          refundAccountNumber: form.get('refundAccountNumber'),
          refundAccountHolder: form.get('refundAccountHolder'),
        }),
      });
      const result = await response.json() as { error?: unknown; message?: unknown };

      if (!response.ok) {
        setFeedback({ type: 'error', text: getErrorMessage(result?.error ?? result, 'Không thể gửi yêu cầu lúc này.') });
        return;
      }

      formElement.reset();
      setIsRefundRequested(false);
      setBankName('');
      setOtherBankName('');
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

        <div className="return-refund-group return-form-full-width">
          <div>
            <label className="return-refund-toggle">
              <input type="checkbox" checked={isRefundRequested} onChange={(event) => {
                setIsRefundRequested(event.target.checked);
                if (!event.target.checked) {
                  setBankName('');
                  setOtherBankName('');
                }
              }} />
              <span>Tôi muốn hoàn tiền về tài khoản ngân hàng / ví điện tử (thay vì đổi gói mới)</span>
            </label>
          </div>
          {isRefundRequested && <div className="return-form-grid">
            <div className="return-form-field">
              <label htmlFor="return-refund-bank">Ngân hàng hoặc Ví nhận tiền</label>
              <select
                id="return-refund-bank"
                name="refundBankName"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#8B2323]"
              >
                <option value="">-- Chọn ngân hàng hoặc ví nhận tiền --</option>
                <optgroup label="Ví điện tử">
                  <option value="MOMO">Ví MoMo</option>
                  <option value="ZALOPAY">Ví ZaloPay</option>
                  <option value="VIETTELMONEY">Viettel Money</option>
                </optgroup>
                <optgroup label="Ngân hàng phổ biến">
                  <option value="MB">MB Bank (Ngân hàng Quân Đội)</option>
                  <option value="VCB">Vietcombank (Ngoại thương)</option>
                  <option value="TCB">Techcombank (Kỹ thương)</option>
                  <option value="CTG">VietinBank (Công thương)</option>
                  <option value="BIDV">BIDV (Đầu tư & Phát triển)</option>
                  <option value="ACB">ACB (Á Châu)</option>
                  <option value="VPB">VPBank (Việt Nam Thịnh Vượng)</option>
                  <option value="TPB">TPBank (Tiên Phong)</option>
                  <option value="STB">Sacombank (Sài Gòn Thương Tín)</option>
                  <option value="VIB">VIB (Quốc tế)</option>
                  <option value="HDB">HDBank (Phát triển TP.HCM)</option>
                  <option value="OTHER">Ngân hàng khác (Nhập thủ công)</option>
                </optgroup>
              </select>
              {bankName === 'OTHER' && <input className="return-other-bank-input" aria-label="Tên ngân hàng khác" value={otherBankName} onChange={(event) => setOtherBankName(event.target.value)} maxLength={100} placeholder="Nhập tên ngân hàng hoặc ví" required />}
            </div>
            <div className="return-form-field">
              <label htmlFor="return-refund-account">Số tài khoản / Số điện thoại ví</label>
              <input id="return-refund-account" name="refundAccountNumber" maxLength={100} placeholder="Nhập số tài khoản hoặc SĐT ví" inputMode="text" />
            </div>
            <div className="return-form-field return-form-full-width">
              <label htmlFor="return-refund-holder">Tên chủ tài khoản</label>
              <input id="return-refund-holder" name="refundAccountHolder" maxLength={120} placeholder="Tên chủ tài khoản hoặc ví" autoComplete="name" />
            </div>
          </div>}
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