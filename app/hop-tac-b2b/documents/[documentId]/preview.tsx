'use client';

import Link from 'next/link';
import type { ExportDocument } from '@/lib/b2b-export-documents';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent, translateProductName } from '@/lib/translations';

export default function ExportDocumentPreview({ document }: { document: ExportDocument }) {
  const { locale } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);
  const productName = translateProductName('Chẳm Chéo Ướt Chuẩn Vị Điện Biên', locale);

  return (
    <main className="export-document-page">
      <div className="export-document-toolbar">
        <Link href="/hop-tac-b2b">{text('Quay lại trang đối tác')}</Link>
        <button type="button" onClick={() => window.print()}>{text('In / Lưu dưới dạng PDF')}</button>
      </div>
      <article className="export-document-sheet">
        <header className="export-document-header">
          <div><p className="export-document-brand">MẮC KHÉN FARM</p><p className="export-document-origin">Northwest Vietnam · Export Partner Documents</p></div>
          <span className="export-document-stamp" aria-label={text('Mắc Khén Farm Quality Control')}>
            <strong>MKF</strong><span>{text('Kiểm soát chất lượng')}</span><small>{text('Mẫu dấu')}</small>
          </span>
        </header>
        <p className="export-document-sample-notice">{text('Chứng từ mẫu · Chỉ tham khảo · Không phải chứng nhận chính thức')}</p>
        <h1>{document.title}</h1>
        <p className="export-document-subtitle">{text(document.detail)}</p>
        <dl className="export-document-metadata">
          <div><dt>{text('Mã tài liệu')}</dt><dd>{document.reference}</dd></div>
          <div><dt>{text('Tiêu chuẩn tham khảo')}</dt><dd>SFA Singapore · ISO 22000</dd></div>
        </dl>
        <section className="export-document-section">
          <h2>{text('Thông tin sản phẩm')}</h2>
          <dl className="export-document-facts">
            <div><dt>{text('Sản phẩm')}</dt><dd>{productName}</dd></div>
            {document.id === 'product-specification' && <>
              <div><dt>{text('Thành phần chính')}</dt><dd>Ớt thóc, tỏi nếp Điện Biên, rau mùi tàu, mắc khén, hạt dổi và muối hầm.</dd></div>
              <div><dt>{text('Quy cách đóng gói')}</dt><dd>{text('Hũ nắp nhôm 250g')}</dd></div>
              <div><dt>{text('Khối lượng tịnh')}</dt><dd>250g</dd></div>
            </>}
            {document.id === 'coa' && <>
              <div><dt>{text('Kết quả thử nghiệm')}</dt><dd>{text('Chỉ điền kết quả đã được phòng kiểm nghiệm xác nhận.')}</dd></div>
              <div><dt>{text('Tham chiếu lô')}</dt><dd>BATCH-CC-2026-02</dd></div>
            </>}
            {document.id === 'packing-list' && <>
              <div><dt>{text('Quy cách đóng gói')}</dt><dd>{text('Hũ nắp nhôm 250g')}</dd></div>
              <div><dt>{text('Số lượng')}</dt><dd>{text('Xác nhận theo từng đơn hàng')}</dd></div>
              <div><dt>{text('Tham chiếu lô')}</dt><dd>BATCH-CC-2026-02</dd></div>
            </>}
          </dl>
        </section>
        <p className="export-document-disclaimer">{text('Tài liệu này chỉ là bản mẫu tham khảo, không xác nhận chứng nhận hoặc phê duyệt pháp lý.')}</p>
        <footer className="export-document-footer">
          <span>{text('Được lập cho mục đích tham khảo đối tác xuất khẩu.')}</span>
          <strong>{text('Thông tin chứng từ này là mẫu minh họa. Vui lòng liên hệ Mắc Khén Farm để nhận hồ sơ được xác nhận cho từng lô hàng.')}</strong>
        </footer>
      </article>
    </main>
  );
}