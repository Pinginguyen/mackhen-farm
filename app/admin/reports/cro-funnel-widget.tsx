'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type FunnelMetrics = {
  periodDays: number;
  periodStart: string;
  updatedAt: string;
  productViews: number;
  addToCart: number;
  checkoutStarts: number;
  paidOrders: number;
  addToCartRate: number | null;
  cartToCheckoutRate: number | null;
  checkoutCompletionRate: number | null;
  overallConversionRate: number | null;
  checkoutDropOffRate: number | null;
};

function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${rate.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}

export default function CroFunnelWidget() {
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    let active = true;
    let inFlight = false;

    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch('/api/admin/reports/funnel', { cache: 'no-store' });
        if (!response.ok) throw new Error('Không thể tải dữ liệu phễu chuyển đổi.');
        const data = await response.json() as FunnelMetrics;
        if (active) {
          setMetrics(data);
          setUpdatedAt(new Date(data.updatedAt).toLocaleTimeString('vi-VN'));
          setError('');
        }
      } catch {
        if (active) setError('Không thể tải dữ liệu phễu. Hệ thống sẽ tự thử lại.');
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const stages = metrics ? [
    { title: 'TẦNG 1', name: 'Lượt xem sản phẩm', detail: 'Product Views / ToFu', value: metrics.productViews },
    { title: 'TẦNG 2', name: 'Lượt thêm vào giỏ', detail: 'Add-to-Cart / MoFu · chuyển đổi vi mô', value: metrics.addToCart },
    { title: 'TẦNG 3', name: 'Bắt đầu thanh toán', detail: 'Initiate Checkout / BoFu', value: metrics.checkoutStarts },
    { title: 'TẦNG 4', name: 'Đơn hàng thanh toán thành công', detail: 'Paid Orders / Macro-conversion', value: metrics.paidOrders },
  ] : [];

  return (
    <section className="cro-funnel" aria-labelledby="cro-funnel-title">
      <header className="cro-funnel-header">
        <div>
          <p className="eyebrow">CONVERSION RATE OPTIMIZATION</p>
          <h3 id="cro-funnel-title">Phễu chuyển đổi thương mại điện tử</h3>
          <p>Dữ liệu 30 ngày gần nhất · số liệu làm mới mỗi 30 giây</p>
        </div>
        <span className="cro-funnel-updated"><RefreshCw size={14} aria-hidden="true" />{updatedAt ? `Cập nhật ${updatedAt}` : loading ? 'Đang tải' : 'Chưa cập nhật'}</span>
      </header>

      <p className="cro-funnel-benchmark">Chuẩn ngành TMĐT FMCG: CR dao động 2.0% - 4.0% (Theo Slide 6.10 giáo trình TMĐT UTH)</p>

      {error && <p className="cro-funnel-error" role="status">{error}</p>}
      {loading && !metrics ? <p className="cro-funnel-empty" role="status">Đang tải dữ liệu chuyển đổi...</p> : metrics && <>
        <div className="cro-funnel-stages" aria-label="Bốn tầng phễu chuyển đổi">
          {stages.map((stage, index) => {
            const base = metrics.productViews;
            const width = index === 0 ? (base ? 100 : 0) : base ? Math.min(100, stage.value / base * 100) : 0;
            return (
              <article className="cro-funnel-stage" key={stage.title}>
                <div className="cro-funnel-stage-copy">
                  <span>{stage.title}</span>
                  <div><strong>{stage.name}</strong><small>{stage.detail}</small></div>
                </div>
                <div className="cro-funnel-track" role="progressbar" aria-label={stage.name} aria-valuemin={0} aria-valuemax={base || 0} aria-valuenow={stage.value}>
                  <span className={`cro-funnel-bar stage-${index + 1}`} style={{ width: `${width}%` }} />
                </div>
                <strong className="cro-funnel-count">{stage.value.toLocaleString('vi-VN')}</strong>
              </article>
            );
          })}
        </div>

        <div className="cro-funnel-rates">
          <div><span>CR Giỏ hàng (Add-to-Cart Rate)</span><strong>{formatRate(metrics.addToCartRate)}</strong></div>
          <div><span>Giữ chân từ giỏ sang checkout</span><strong>{formatRate(metrics.cartToCheckoutRate)}</strong></div>
          <div><span>CR Thanh toán (Checkout Completion Rate)</span><strong>{formatRate(metrics.checkoutCompletionRate)}</strong></div>
          <div><span>CR Tổng thể</span><strong>{formatRate(metrics.overallConversionRate)}</strong></div>
        </div>

        <aside className={`cro-funnel-insight${(metrics.checkoutDropOffRate ?? 0) > 60 ? ' is-warning' : ''}`}>
          <strong>Khuyến nghị tối ưu</strong>
          {metrics.checkoutDropOffRate === null
            ? <p>Chưa có lượt bắt đầu thanh toán trong kỳ để đánh giá tỷ lệ rớt ở Tầng 3.</p>
            : metrics.checkoutDropOffRate > 60
              ? <p>Tỷ lệ rớt ở Tầng 3 là {formatRate(metrics.checkoutDropOffRate)}. Cần tối ưu giảm bớt trường form checkout hoặc đẩy mạnh mã FREESHIP.</p>
              : <p>Tỷ lệ rớt ở Tầng 3 là {formatRate(metrics.checkoutDropOffRate)}, chưa vượt ngưỡng cảnh báo 60%.</p>}
        </aside>
      </>}
    </section>
  );
}