'use client';

import { useState } from 'react';
import { CheckCircle2, Cog, Flame, Leaf, LoaderCircle, Search, ShieldCheck } from 'lucide-react';

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

export default function TraceabilityPage() {
  const [query, setQuery] = useState('');
  const [batch, setBatch] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function searchBatch(batchCode: string) {
    const normalizedCode = batchCode.trim().toUpperCase();
    if (!normalizedCode) {
      setError('Vui lòng nhập mã lô sản xuất.');
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
        setError('Không tìm thấy dữ liệu cho mã lô này. Vui lòng kiểm tra lại ký tự in dưới đáy bao bì.');
      } else if (!response.ok || !result.success || !result.data) {
        setError(result.error ?? 'Không thể tra cứu mã lô. Vui lòng thử lại.');
      } else {
        setBatch(result.data);
      }
    } catch {
      setError('Không thể kết nối để tra cứu mã lô. Vui lòng thử lại.');
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
            <h1>Truy Xuất Nguồn Gốc Theo Lô (Batch Traceability)</h1>
            <p className="traceability-intro">Minh bạch toàn bộ chuỗi cung ứng từ phụ phẩm nông nghiệp đến thành phẩm đặc sản sấy an toàn.</p>
          </div>
          <div className="traceability-hero-mark" aria-hidden="true"><Leaf size={54} strokeWidth={1.2} /><span>FROM SOURCE<br />TO TABLE</span></div>
        </div>
      </section>

      <section className="traceability-shell traceability-lookup" aria-labelledby="traceability-lookup-title">
        <div className="traceability-lookup-heading">
          <div><p className="traceability-kicker">BATCH LOOKUP</p><h2 id="traceability-lookup-title">Tra cứu mã lô</h2></div>
          <p>Nhập mã in trên bao bì để xem hành trình sản phẩm.</p>
        </div>
        <form className="traceability-search-form" onSubmit={handleSubmit}>
          <label className="traceability-search-box" htmlFor="batch-code"><Search size={19} aria-hidden="true" /><input id="batch-code" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập mã lô in trên bao bì (ví dụ: BATCH-KB-2026-01)..." /></label>
          <button type="submit" disabled={loading}>{loading ? <><LoaderCircle size={16} className="traceability-spinner" aria-hidden="true" /> Đang tra cứu...</> : 'Tra cứu'}</button>
        </form>
        <div className="traceability-samples" aria-label="Mã lô tra cứu nhanh">
          <span>TRA CỨU NHANH</span>
          {quickSearches.map((batchCode) => <button key={batchCode} type="button" disabled={loading} onClick={() => void searchBatch(batchCode)}>{batchCode}</button>)}
        </div>
        {error && <p className="traceability-api-message is-error" role="alert">{error}</p>}
      </section>

      <section className="traceability-journey" aria-labelledby="traceability-journey-title">
        <div className="traceability-shell">
          <div className="traceability-journey-heading">
            <div><p className="traceability-kicker">SUPPLIER → BATCH → FINISHED GOODS</p><h2 id="traceability-journey-title">Hành trình chuỗi cung ứng</h2></div>
            {batch && <div className="traceability-compliance"><CheckCircle2 size={17} aria-hidden="true" /><span>Đã kiểm định ATTP &amp; Lưu hành hợp pháp</span></div>}
          </div>
          {batch ? <>
            <section className="traceability-product" aria-label="Thông tin sản phẩm">
              <div className="traceability-product-heading"><p className="traceability-kicker">{batch.batchCode}</p><h3>{batch.productName}</h3></div>
              <dl className="traceability-product-facts">
                <div><dt>Ngày sản xuất</dt><dd>{batch.manufacturingDate}</dd></div>
                <div><dt>Hạn sử dụng</dt><dd>{batch.expiryDate}</dd></div>
                {batch.packaging && <div><dt>Quy cách</dt><dd>{batch.packaging}</dd></div>}
                {batch.ingredients && <div><dt>Thành phần</dt><dd>{batch.ingredients}</dd></div>}
              </dl>
            </section>
            <ol className="traceability-timeline">
              {batch.steps.map((step, index) => {
                const StepIcon = stepIcons[index];
                return <li className="traceability-step" key={step.label}>
                  <div className="traceability-step-marker"><StepIcon size={20} aria-hidden="true" /><span>{String(index + 1).padStart(2, '0')}</span></div>
                  <div className="traceability-step-content"><p className="traceability-step-date">CÔNG ĐOẠN {String(index + 1).padStart(2, '0')}</p><h3>{step.label}</h3><p>{step.detail}</p></div>
                </li>;
              })}
            </ol>
          </> : <p className="traceability-empty-state">Nhập mã lô in trên bao bì để xem hồ sơ truy xuất.</p>}
        </div>
      </section>
    </main>
  );
}