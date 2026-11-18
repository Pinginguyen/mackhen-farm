'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/store-data';

export type RevenueTrendPoint = { key: string; label: string; revenue: number };

export default function RevenueTrendChart({ weekly, monthly }: { weekly: RevenueTrendPoint[]; monthly: RevenueTrendPoint[] }) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const points = period === 'weekly' ? weekly : monthly;
  const width = 760;
  const height = 260;
  const padding = { top: 16, right: 18, bottom: 42, left: 74 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(1, ...points.map((point) => point.revenue));
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length <= 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1)),
    y: padding.top + plotHeight - point.revenue / maxRevenue * plotHeight,
  }));
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <section className="admin-report-panel revenue-trend-panel" aria-labelledby="revenue-trend-title">
      <header className="admin-report-panel-header">
        <div><p className="eyebrow">DOANH THU ĐÃ THANH TOÁN</p><h3 id="revenue-trend-title">Xu hướng doanh thu</h3></div>
        <div className="revenue-trend-switch" role="group" aria-label="Khoảng thời gian biểu đồ">
          <button type="button" aria-pressed={period === 'weekly'} onClick={() => setPeriod('weekly')}>12 tuần</button>
          <button type="button" aria-pressed={period === 'monthly'} onClick={() => setPeriod('monthly')}>12 tháng</button>
        </div>
      </header>
      {!points.some((point) => point.revenue > 0) ? <p className="empty-state">Chưa có doanh thu đã thanh toán trong khoảng thời gian này.</p> : (
        <div className="revenue-trend-scroll">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Biểu đồ doanh thu ${period === 'weekly' ? '12 tuần' : '12 tháng'} gần nhất`}>
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
              const y = padding.top + plotHeight * (1 - fraction);
              return <g key={fraction}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e7e5e4" strokeDasharray="3 5" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end">{formatCurrency(Math.round(maxRevenue * fraction))}</text>
              </g>;
            })}
            {coordinates.length > 1 && <polyline points={polyline} fill="none" stroke="#9b2424" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
            {coordinates.map((point, index) => <g key={point.key}>
              <circle cx={point.x} cy={point.y} r="4" fill="#1b4332"><title>{`${point.label}: ${formatCurrency(point.revenue)}`}</title></circle>
              {(index % labelStep === 0 || index === coordinates.length - 1) && <text x={point.x} y={height - 13} textAnchor="middle">{point.label}</text>}
            </g>)}
          </svg>
        </div>
      )}
    </section>
  );
}