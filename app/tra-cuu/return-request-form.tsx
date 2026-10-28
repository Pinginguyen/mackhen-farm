'use client';

import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

const issueTypes = [
  'Giao sai sản phẩm',
  'Bao bì bị rách hoặc xì chân không',
  'Hàng có dấu hiệu ẩm mốc',
  'Khác',
];
const maxEvidenceBytes = 5 * 1024 * 1024;
const evidenceMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function ReturnRequestForm() {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const text = (value: string) => translateContent(value, isEN ? 'en' : 'vi');
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
      setFeedback({ type: 'error', text: text('Ảnh cần dùng định dạng JPEG, PNG hoặc WebP.') });
      return;
    }

    if (file.size > maxEvidenceBytes) {
      setImageUrl(null);
      setImageName('');
      event.currentTarget.value = '';
      setFeedback({ type: 'error', text: text('Ảnh minh chứng cần có dung lượng tối đa 5MB.') });
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
        setFeedback({ type: 'error', text: text('Không thể đọc ảnh. Vui lòng chọn lại.') });
      }
      setReadingImage(false);
    };
    reader.onerror = () => {
      if (readerIdRef.current !== readerId) return;
      setFeedback({ type: 'error', text: text('Không thể đọc ảnh. Vui lòng chọn lại.') });
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
        setFeedback({ type: 'error', text: isEN ? text('Không thể gửi yêu cầu lúc này.') : getErrorMessage(result?.error ?? result, 'Không thể gửi yêu cầu lúc này.') });
        return;
      }

      formElement.reset();
      setIsRefundRequested(false);
      setBankName('');
      setOtherBankName('');
      setImageUrl(null);
      setImageName('');
      setFeedback({ type: 'success', text: text('Đã tiếp nhận yêu cầu! Đội ngũ CSKH sẽ liên hệ hỗ trợ bạn trong vòng 30 phút') });
    } catch {
      setFeedback({ type: 'error', text: text('Không thể kết nối. Vui lòng thử lại.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="return-request-form" className="return-request-form" onSubmit={submitRequest} onChange={() => setFeedback(null)}>
      <div className="return-form-grid">
        <div className="return-form-field">
          <label htmlFor="return-order-code">{text('Mã đơn hàng')} <span aria-hidden="true">*</span></label>
          <input id="return-order-code" name="orderCode" placeholder="MKF-XXXX" required />
        </div>

        <div className="return-form-field">
          <label htmlFor="return-phone">{text('Số điện thoại đặt hàng')} <span aria-hidden="true">*</span></label>
          <input id="return-phone" name="phone" type="tel" autoComplete="tel" placeholder={text('Nhập số điện thoại đặt hàng')} required />
        </div>

        <div className="return-form-field">
          <label htmlFor="return-issue">{text('Phân loại sự cố')} <span aria-hidden="true">*</span></label>
          <select id="return-issue" name="issue" defaultValue="" required>
            <option value="" disabled>{text('Chọn tình trạng cần hỗ trợ')}</option>
            {issueTypes.map((issue) => <option key={issue} value={issue}>{text(issue)}</option>)}
          </select>
        </div>

        <div className="return-form-field return-form-full-width">
          <label htmlFor="return-description">{text('Mô tả chi tiết')} <span aria-hidden="true">*</span></label>
          <textarea id="return-description" name="description" rows={4} placeholder={text('Mô tả tình trạng bạn gặp phải...')} required />
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
              <span>{text('Tôi muốn hoàn tiền về tài khoản ngân hàng / ví điện tử (thay vì đổi gói mới)')}</span>
            </label>
          </div>
          {isRefundRequested && <div className="return-form-grid">
            <div className="return-form-field">
              <label htmlFor="return-refund-bank">{text('Ngân hàng hoặc Ví nhận tiền')}</label>
              <select
                id="return-refund-bank"
                name="refundBankName"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#8B2323]"
              >
                <option value="">{text('-- Chọn ngân hàng hoặc ví nhận tiền --')}</option>
                <optgroup label={text('Ví điện tử')}>
                  <option value="MOMO">Ví MoMo</option>
                  <option value="ZALOPAY">Ví ZaloPay</option>
                  <option value="VIETTELMONEY">Viettel Money</option>
                </optgroup>
                <optgroup label={text('Ngân hàng phổ biến')}>
                  <option value="MB">{text('MB Bank (Ngân hàng Quân Đội)')}</option>
                  <option value="VCB">{text('Vietcombank (Ngoại thương)')}</option>
                  <option value="TCB">{text('Techcombank (Kỹ thương)')}</option>
                  <option value="CTG">{text('VietinBank (Công thương)')}</option>
                  <option value="BIDV">{text('BIDV (Đầu tư & Phát triển)')}</option>
                  <option value="ACB">{text('ACB (Á Châu)')}</option>
                  <option value="VPB">{text('VPBank (Việt Nam Thịnh Vượng)')}</option>
                  <option value="TPB">{text('TPBank (Tiên Phong)')}</option>
                  <option value="STB">{text('Sacombank (Sài Gòn Thương Tín)')}</option>
                  <option value="VIB">{text('VIB (Quốc tế)')}</option>
                  <option value="HDB">{text('HDBank (Phát triển TP.HCM)')}</option>
                  <option value="OTHER">{text('Ngân hàng khác (Nhập thủ công)')}</option>
                </optgroup>
              </select>
              {bankName === 'OTHER' && <input className="return-other-bank-input" aria-label={text('Tên ngân hàng khác')} value={otherBankName} onChange={(event) => setOtherBankName(event.target.value)} maxLength={100} placeholder={text('Nhập tên ngân hàng hoặc ví')} required />}
            </div>
            <div className="return-form-field">
              <label htmlFor="return-refund-account">{text('Số tài khoản / Số điện thoại ví')}</label>
              <input id="return-refund-account" name="refundAccountNumber" maxLength={100} placeholder={text('Nhập số tài khoản hoặc SĐT ví')} inputMode="text" />
            </div>
            <div className="return-form-field return-form-full-width">
              <label htmlFor="return-refund-holder">{text('Tên chủ tài khoản')}</label>
              <input id="return-refund-holder" name="refundAccountHolder" maxLength={120} placeholder={text('Tên chủ tài khoản hoặc ví')} autoComplete="name" />
            </div>
          </div>}
        </div>

        <div className="return-form-field return-form-full-width">
          <span className="return-evidence-label">{text('Ảnh minh chứng (nếu có)')}</span>
          <label className="return-upload-control" htmlFor="return-evidence-file">
            <span className="return-upload-icon"><Upload size={20} aria-hidden="true" /><Camera size={18} aria-hidden="true" /></span>
            <span>{readingImage ? text('Đang đọc ảnh...') : imageName || text('Bấm để tải ảnh minh chứng hoặc chụp ảnh mới')}</span>
            <input
              ref={fileInputRef}
              id="return-evidence-file"
              name="evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectEvidence}
            />
          </label>
          <small className="return-evidence-help">{text('Chọn ảnh từ thiết bị hoặc camera · JPEG, PNG, WebP · Tối đa 5MB')}</small>
          {imageUrl && (
            <div className="return-upload-preview">
              <img src={imageUrl} alt={text('Xem trước ảnh minh chứng')} />
              <button type="button" onClick={removeEvidence} aria-label={text('Xóa ảnh minh chứng')} title={text('Xóa ảnh')}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <button className="return-submit-button" type="submit" disabled={saving || readingImage}>{saving ? text('Đang gửi...') : readingImage ? text('Đang đọc ảnh...') : text('Gửi yêu cầu đổi trả')}</button>
      {feedback && <p className={`return-submit-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    </form>
  );
}