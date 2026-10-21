'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Download, FileCheck2, Globe2, Send } from 'lucide-react';
import Link from 'next/link';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';
import { exportDocuments } from '@/lib/b2b-export-documents';

const successNotice = 'Yêu cầu đã được ghi nhận. Quản lý phát triển thị trường sẽ liên hệ với bạn qua Email trong 24h.';
const emailNotice = 'Yêu cầu đã được lưu, nhưng email thông báo quản trị chưa gửi được. Vui lòng thử lại sau.';

export default function B2BPartnershipPage() {
  const { locale } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function submitInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);
    setToast('');
    try {
      const response = await fetch('/api/b2b/inquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = await response.json() as { emailSent?: boolean; error?: { message?: string } };
      if (!response.ok) throw new Error(text(result.error?.message ?? 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
      form.reset();
      setToast(text(result.emailSent === false ? emailNotice : successNotice));
    } catch (error) {
      setToast(text(error instanceof Error ? error.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="b2b-page">
      <section className="b2b-hero">
        <div className="b2b-shell b2b-hero-grid">
          <div className="b2b-hero-copy">
            <p className="b2b-eyebrow"><Globe2 size={15} aria-hidden="true" /> INTERNATIONAL TRADE · PARTNER PROGRAM</p>
            <h1>{text('Trở thành Đối tác Phân phối Toàn cầu (Global B2B Partners)')}</h1>
            <p className="b2b-hero-description">{text('Đồng hành cùng Mắc Khén Farm đưa đặc sản sấy Tây Bắc vươn tầm Đông Nam Á (Thị trường trọng điểm: Singapore, Malaysia).')}</p>
            <a className="b2b-hero-link" href="#partner-inquiry">{text('Trao đổi cơ hội hợp tác')} <ArrowUpRight size={17} aria-hidden="true" /></a>
            <div className="b2b-market-list"><span>Singapore</span><span>Malaysia</span><span>Australia</span></div>
          </div>
          <figure className="b2b-hero-image">
            <img src="/products/xe-soi.jpg" alt={text('Sản phẩm thực vật Mắc Khén Farm mang hương vị Tây Bắc')} />
            <figcaption><span>Origin</span><strong>Northwest Vietnam</strong></figcaption>
          </figure>
        </div>
      </section>

      <section className="b2b-shell b2b-documents" aria-labelledby="b2b-documents-title">
        <div className="b2b-section-heading">
          <div><p className="b2b-section-kicker">EXPORT DOCUMENTS</p><h2 id="b2b-documents-title">{text('Chứng từ xuất khẩu')}</h2></div>
          <p>{text('Tài liệu mẫu dành cho nhà nhập khẩu và đối tác phân phối.')}</p>
        </div>
        <div className="b2b-document-list">
          {exportDocuments.map((document) => (
            <article className="b2b-document-row" key={document.title}>
              <span className="b2b-document-icon"><FileCheck2 size={20} aria-hidden="true" /></span>
              <div className="b2b-document-copy"><h3>{document.title}</h3><p>{text(document.detail)}</p></div>
              <Link className="b2b-download-button" href={`/hop-tac-b2b/documents/${document.id}`} target="_blank" rel="noopener noreferrer"><Download size={16} aria-hidden="true" /> {text('Tải xuống (PDF)')}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="b2b-inquiry-band" id="partner-inquiry">
        <div className="b2b-shell b2b-inquiry-grid">
          <div className="b2b-inquiry-intro">
            <p className="b2b-section-kicker">PARTNER INQUIRY</p>
            <h2>{text('Kết nối cùng đội ngũ phát triển thị trường')}</h2>
            <p>{text('Chia sẻ thông tin doanh nghiệp và nhu cầu nhập hàng để chúng tôi chuẩn bị trao đổi phù hợp.')}</p>
            <div className="b2b-response-note"><span>01</span><p>{text('Đội ngũ phụ trách sẽ liên hệ qua email trong vòng 24 giờ.')}</p></div>
          </div>
          <form className="b2b-inquiry-form" onSubmit={submitInquiry}>
            <div className="b2b-form-field"><label htmlFor="b2b-company">{text('Tên Công ty')}</label><input id="b2b-company" name="companyName" autoComplete="organization" required /></div>
            <div className="b2b-form-field"><label htmlFor="b2b-country">{text('Quốc gia')}</label><select id="b2b-country" name="country" defaultValue="Singapore" required><option>Singapore</option><option>Malaysia</option><option>Australia</option><option value="Khác">{text('Khác')}</option></select></div>
            <div className="b2b-form-field"><label htmlFor="b2b-contact">{text('Người liên hệ')}</label><input id="b2b-contact" name="contactName" autoComplete="name" required /></div>
            <div className="b2b-form-field"><label htmlFor="b2b-phone">{text('Điện thoại')}</label><input id="b2b-phone" name="phone" type="tel" autoComplete="tel" /></div>
            <div className="b2b-form-field"><label htmlFor="b2b-email">Email</label><input id="b2b-email" name="email" type="email" autoComplete="email" required /></div>
            <div className="b2b-form-field"><label htmlFor="b2b-moq">{text('Mức đặt hàng tối thiểu dự kiến (MOQ)')}</label><input id="b2b-moq" name="expectedVolume" type="text" placeholder={text('Ví dụ: 500 gói / tháng')} required /></div>
            <div className="b2b-form-field b2b-message-field"><label htmlFor="b2b-message">{text('Thông tin bổ sung')}</label><textarea id="b2b-message" name="message" rows={3} maxLength={3000} /></div>
            <button className="b2b-submit-button" type="submit" disabled={submitting}>{submitting ? text('Đang gửi...') : text('Gửi Yêu Cầu')} <Send size={16} aria-hidden="true" /></button>
          </form>
        </div>
      </section>
      {toast && <div className="b2b-toast" role="status">{toast}</div>}
    </main>
  );
}