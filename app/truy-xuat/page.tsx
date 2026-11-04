'use client';

import { useState } from 'react';
import { CheckCircle2, Cog, Flame, FlaskConical, Leaf, LoaderCircle, MapPin, Search, ShieldCheck } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent, translateProductName } from '@/lib/translations';

type TraceabilityData = {
  batchCode: string;
  productName: string;
  manufacturingDate: string;
  expiryDate: string;
  packaging?: string;
  ingredients?: string;
  steps: { label: string; detail: string }[];
};

type TraceabilityResponse = { success: boolean; data?: TraceabilityData; error?: string };

const quickSearches = ['BATCH-KB-2026-01', 'BATCH-CC-2026-02'];
const stepIcons = [Leaf, Cog, Flame, ShieldCheck];
const englishStepLabels = ['Raw Materials', 'Processing', 'Dehydration & Packaging', 'Quality Inspection'];
const timelineStepAnimations = [
  'animate-in fade-in slide-in-from-bottom-6 duration-500 fill-mode-both',
  'animate-in fade-in slide-in-from-bottom-6 duration-500 delay-150 fill-mode-both',
  'animate-in fade-in slide-in-from-bottom-6 duration-500 delay-300 fill-mode-both',
  'animate-in fade-in slide-in-from-bottom-6 duration-500 delay-500 fill-mode-both',
];

export default function TraceabilityPage() {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const text = (value: string) => translateContent(value, isEN ? 'en' : 'vi');
  const [query, setQuery] = useState('');
  const [batch, setBatch] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function searchBatch(batchCode: string) {
    const normalizedCode = batchCode.trim().toUpperCase();
    if (!normalizedCode) {
      setError(text('Vui lòng nhập mã lô sản xuất.'));
      setBatch(null);
      return;
    }

    setQuery(normalizedCode);
    setLoading(true);
    setError('');
    setBatch(null);
    try {
      const response = await fetch(`/api/traceability/${encodeURIComponent(normalizedCode)}`, { cache: 'no-store' });
      const result = await response.json() as TraceabilityResponse;
      if (response.status === 404) {
        setError(text('Không tìm thấy dữ liệu cho mã lô này. Vui lòng kiểm tra lại ký tự in dưới đáy bao bì.'));
      } else if (!response.ok || !result.success || !result.data) {
        setError(isEN ? text('Không thể tra cứu mã lô. Vui lòng thử lại.') : text(result.error ?? 'Không thể tra cứu mã lô. Vui lòng thử lại.'));
      } else {
        setBatch(result.data);
      }
    } catch {
      setError(text('Không thể kết nối để tra cứu mã lô. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchBatch(query);
  }

  return (
    <main className="traceability-page">
      <section className="traceability-hero">
        <div className="traceability-shell traceability-hero-inner">
          <div>
            <p className="traceability-eyebrow"><span /> FOOD SAFETY · SUPPLY CHAIN TRANSPARENCY</p>
            <h1>{text('Truy Xuất Nguồn Gốc Theo Lô (Batch Traceability)')}</h1>
            <p className="traceability-intro">{text('Minh bạch toàn bộ chuỗi cung ứng từ phụ phẩm nông nghiệp đến thành phẩm đặc sản sấy an toàn.')}</p>
          </div>
          <div className="traceability-hero-mark" aria-hidden="true"><Leaf size={54} strokeWidth={1.2} /><span>FROM SOURCE<br />TO TABLE</span></div>
        </div>
      </section>

      <section className="traceability-shell traceability-lookup" aria-labelledby="traceability-lookup-title">
        <div className="traceability-lookup-heading">
          <div><p className="traceability-kicker">BATCH LOOKUP</p><h2 id="traceability-lookup-title">{text('Tra cứu mã lô')}</h2></div>
          <p>{text('Nhập mã in trên bao bì để xem hành trình sản phẩm.')}</p>
        </div>
        <form className="traceability-search-form" onSubmit={handleSubmit}>
          <label className="traceability-search-box" htmlFor="batch-code"><Search size={19} aria-hidden="true" /><input id="batch-code" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text('Nhập mã lô in trên bao bì (ví dụ: BATCH-KB-2026-01)...')} /></label>
          <button className="micro-tactile" type="submit" disabled={loading}>{loading ? <><LoaderCircle size={16} className="traceability-spinner" aria-hidden="true" /> {text('Đang tra cứu...')}</> : text('Tra cứu')}</button>
        </form>
        <div className="traceability-samples" aria-label={text('Mã lô tra cứu nhanh')}>
          <span>{text('TRA CỨU NHANH')}</span>
          {quickSearches.map((batchCode) => <button className="micro-tactile micro-tactile--small" key={batchCode} type="button" disabled={loading} onClick={() => void searchBatch(batchCode)}>{batchCode}</button>)}
        </div>
        {error && <p className="traceability-api-message is-error" role="alert">{error}</p>}
      </section>

      <section className="traceability-journey" aria-labelledby="traceability-journey-title">
        <div className="traceability-shell">
          <div className="traceability-journey-heading">
            <div><p className="traceability-kicker">SUPPLIER → BATCH → FINISHED GOODS</p><h2 id="traceability-journey-title">{text('Hành trình chuỗi cung ứng')}</h2></div>
            {batch && <div className="traceability-compliance"><CheckCircle2 size={17} aria-hidden="true" /><span>{text('Hộ chiếu số · Hồ sơ lô hàng')}</span></div>}
          </div>
          {batch ? <>
            <section className="traceability-product" aria-label={text('Thông tin sản phẩm')}>
              <div className="traceability-product-heading"><p className="traceability-kicker">{batch.batchCode}</p><h3>{translateProductName(batch.productName, isEN ? 'en' : 'vi')}</h3></div>
              <dl className="traceability-product-facts">
                <div><dt>{text('Ngày sản xuất')}</dt><dd>{batch.manufacturingDate}</dd></div>
                <div><dt>{text('Hạn sử dụng')}</dt><dd>{batch.expiryDate}</dd></div>
                {batch.packaging && <div><dt>{text('Quy cách')}</dt><dd>{text(batch.packaging)}</dd></div>}
                {batch.ingredients && <div><dt>{text('Thành phần')}</dt><dd>{text(batch.ingredients)}</dd></div>}
              </dl>
            </section>
            <section className="dpp-passport" aria-labelledby="dpp-passport-title">
              <header className="dpp-passport-heading"><div><p className="traceability-kicker">DIGITAL PRODUCT PASSPORT</p><h3 id="dpp-passport-title">{isEN ? 'Upcycled food supply passport' : 'Hộ chiếu số chuỗi cung ứng Upcycled Food'}</h3></div><span>{batch.batchCode}</span></header>
              <p className="dpp-disclosure" role="note">{isEN ? 'Supplier-provided profile information. Coordinates and lab indicators below are not independently verified or linked to an uploaded certificate for this batch.' : 'Thông tin hồ sơ do đơn vị cung cấp. Tọa độ và chỉ tiêu kiểm nghiệm dưới đây chưa được xác minh độc lập hoặc liên kết với chứng thư tải lên cho mã lô này.'}</p>
              <div className="dpp-section-title"><MapPin size={17} aria-hidden="true" /><h4>{isEN ? 'Geo-supply nodes' : 'Các nút chuỗi cung ứng'}</h4></div>
              <ol className="dpp-supply-nodes">
                <li><span>01</span><div><strong>{isEN ? 'Fresh soy pulp collection' : 'Thu gom bã đậu nành tươi'}</strong><p>{isEN ? 'Soy milk facility, Tien Son Industrial Park, Bac Ninh (ISO 22000 status is supplier-reported).' : 'Nhà máy sữa đậu nành, KCN Tiên Sơn, Bắc Ninh (thông tin ISO 22000 do đơn vị cung cấp).'}</p><small>21.012°N, 106.015°E</small></div></li>
                <li><span>02</span><div><strong>{isEN ? 'Native mac khen and doi seed region' : 'Vùng nguyên liệu Mắc Khén & Hạt Dổi bản địa'}</strong><p>{isEN ? 'Hua Tat village, Van Ho, Son La.' : 'Bản Hua Tạt, Vân Hồ, Sơn La.'}</p><small>20.738°N, 104.912°E</small></div></li>
                <li><span>03</span><div><strong>{isEN ? 'Low-temperature drying' : 'Sấy thăng hoa nhiệt độ thấp'}</strong><p>{isEN ? 'Reported process: 60°C; moisture target reduced from 80% to below 7.5%. Verify against the batch process record.' : 'Quy trình được cung cấp: 60°C; độ ẩm mục tiêu giảm từ 80% xuống dưới 7,5%. Cần đối chiếu hồ sơ sản xuất của lô.'}</p></div></li>
              </ol>
              <div className="dpp-section-title"><FlaskConical size={17} aria-hidden="true" /><h4>{isEN ? 'Food safety indicators' : 'Chỉ số an toàn thực phẩm'}</h4></div>
              <p className="dpp-lab-disclosure">{isEN ? 'Reported test results; the NIFTT laboratory report and batch-specific certificate are not attached.' : 'Kết quả được cung cấp; chưa đính kèm phiếu thử nghiệm NIFTT và chứng thư gắn mã lô.'}</p>
              <div className="dpp-lab-table-wrap"><table className="dpp-lab-table"><thead><tr><th>{isEN ? 'Indicator' : 'Chỉ tiêu'}</th><th>{isEN ? 'Reported result' : 'Kết quả được cung cấp'}</th><th>{isEN ? 'Reference' : 'Tham chiếu'}</th></tr></thead><tbody>
                <tr><th>Salmonella</th><td>{isEN ? 'Negative' : 'Âm tính'}</td><td>{isEN ? 'Certificate not attached' : 'Chưa đính kèm chứng thư'}</td></tr>
                <tr><th>E. coli</th><td>&lt; 10 CFU/g</td><td>QCVN 8-2:2011/BYT</td></tr>
                <tr><th>{isEN ? 'Aflatoxin / mould' : 'Aflatoxin / Nấm mốc'}</th><td>{isEN ? 'Not detected' : 'Không phát hiện'}</td><td>{isEN ? 'Certificate not attached' : 'Chưa đính kèm chứng thư'}</td></tr>
              </tbody></table></div>
            </section>
            <div className="traceability-timeline-wrap">
              <span className="traceability-timeline-line animate-in fade-in duration-500 fill-mode-both" aria-hidden="true" />
              <ol className="traceability-timeline">
                {batch.steps.map((step, index) => {
                  const StepIcon = stepIcons[index];
                  return <li className={`traceability-step ${timelineStepAnimations[index] ?? ''}`} key={step.label}>
                    <div className="traceability-step-marker"><StepIcon size={20} aria-hidden="true" /><span>{String(index + 1).padStart(2, '0')}</span></div>
                    <div className="traceability-step-content"><p className="traceability-step-date">{isEN ? 'STAGE' : 'CÔNG ĐOẠN'} {String(index + 1).padStart(2, '0')}</p><h3>{isEN ? englishStepLabels[index] ?? text(step.label) : step.label}</h3><p>{text(step.detail)}</p></div>
                  </li>;
                })}
              </ol>
            </div>
          </> : <p className="traceability-empty-state">{text('Nhập mã lô in trên bao bì để xem hồ sơ truy xuất.')}</p>}
        </div>
      </section>
    </main>
  );
}