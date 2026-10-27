'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Cog, Flame, Leaf, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent, translateProductName } from '@/lib/translations';

if (typeof window !== 'undefined') gsap.registerPlugin(useGSAP);

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

export default function TraceabilityPage() {
  const { locale } = useLocaleCurrency();
  const containerRef = useRef<HTMLElement>(null);
  const text = (value: string) => translateContent(value, locale);
  const [query, setQuery] = useState('');
  const [batch, setBatch] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useGSAP(() => {
    const timelineElement = containerRef.current?.querySelector('.traceability-timeline');
    const line = containerRef.current?.querySelector('.traceability-timeline-line');
    const steps = gsap.utils.toArray<HTMLElement>('.traceability-step', containerRef.current);
    if (!timelineElement || !line || !steps.length) return;

    const media = gsap.matchMedia();
    media.add({
      isMobile: '(max-width: 760px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    }, (context) => {
      const isMobile = Boolean(context.conditions?.isMobile);
      if (context.conditions?.reduceMotion) {
        gsap.set(line, { scaleX: 1, scaleY: 1 });
        gsap.set(steps, { autoAlpha: 1, y: 0 });
        return;
      }

      const reveal = gsap.timeline();
      reveal.fromTo(line,
        isMobile ? { scaleX: 1, scaleY: 0 } : { scaleX: 0, scaleY: 1 },
        { scaleX: 1, scaleY: 1, duration: steps.length * 0.15 + 0.35, ease: 'power1.out' },
        0,
      ).fromTo(steps,
        { autoAlpha: 0, y: 18, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.15, ease: 'back.out(1.5)' },
        0,
      );
    });

    return () => media.revert();
  }, { scope: containerRef, dependencies: [batch], revertOnUpdate: true });

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
        setError(text(result.error ?? 'Không thể tra cứu mã lô. Vui lòng thử lại.'));
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

      <section ref={containerRef} className="traceability-journey" aria-labelledby="traceability-journey-title">
        <div className="traceability-shell">
          <div className="traceability-journey-heading">
            <div><p className="traceability-kicker">SUPPLIER → BATCH → FINISHED GOODS</p><h2 id="traceability-journey-title">{text('Hành trình chuỗi cung ứng')}</h2></div>
            {batch && <div className="traceability-compliance"><CheckCircle2 size={17} aria-hidden="true" /><span>{text('Đã kiểm định ATTP & Lưu hành hợp pháp')}</span></div>}
          </div>
          {batch ? <>
            <section className="traceability-product" aria-label={text('Thông tin sản phẩm')}>
              <div className="traceability-product-heading"><p className="traceability-kicker">{batch.batchCode}</p><h3>{translateProductName(batch.productName, locale)}</h3></div>
              <dl className="traceability-product-facts">
                <div><dt>{text('Ngày sản xuất')}</dt><dd>{batch.manufacturingDate}</dd></div>
                <div><dt>{text('Hạn sử dụng')}</dt><dd>{batch.expiryDate}</dd></div>
                {batch.packaging && <div><dt>{text('Quy cách')}</dt><dd>{text(batch.packaging)}</dd></div>}
                {batch.ingredients && <div><dt>{text('Thành phần')}</dt><dd>{text(batch.ingredients)}</dd></div>}
              </dl>
            </section>
            <div className="traceability-timeline-wrap">
              <span className="traceability-timeline-line" aria-hidden="true" />
              <ol className="traceability-timeline">
                {batch.steps.map((step, index) => {
                  const StepIcon = stepIcons[index];
                  return <li className="traceability-step" key={step.label}>
                    <div className="traceability-step-marker"><StepIcon size={20} aria-hidden="true" /><span>{String(index + 1).padStart(2, '0')}</span></div>
                    <div className="traceability-step-content"><p className="traceability-step-date">{locale === 'en' ? 'STAGE' : 'CÔNG ĐOẠN'} {String(index + 1).padStart(2, '0')}</p><h3>{locale === 'en' ? englishStepLabels[index] ?? text(step.label) : step.label}</h3><p>{text(step.detail)}</p></div>
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