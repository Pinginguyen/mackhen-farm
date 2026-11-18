'use client';

import { useEffect, useState } from 'react';
import { Activity, CircleAlert, Database, RefreshCw, Server, Wifi } from 'lucide-react';

type MonitoringSnapshot = {
  database: 'healthy' | 'unavailable';
  databaseLatencyMs: number | null;
  redis: { status: 'healthy' | 'unavailable' | 'not_configured'; latencyMs: number | null };
  databaseCircuit: { state: 'closed' | 'open'; retryInMs: number };
  api: {
    sampleCount: number;
    averageLatencyMs: number | null;
    totalErrors: number;
    errors4xx: number;
    errors5xx: number;
    errors500: number;
    errors504: number;
    errorRate5xxPercent: number | null;
    windowMinutes: number;
  };
  measuredAt: string;
};

const REFRESH_INTERVAL_MS = 15_000;

function statusLabel(status: MonitoringSnapshot['database'] | MonitoringSnapshot['redis']['status']) {
  if (status === 'healthy') return 'Kết nối tốt';
  if (status === 'not_configured') return 'Chưa cấu hình';
  return 'Không khả dụng';
}

export default function AdminMonitoringPage() {
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let pending = false;

    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch('/api/admin/monitoring', { cache: 'no-store', signal: controller.signal });
        const data = await response.json() as MonitoringSnapshot;
        if (!response.ok) throw new Error('Không thể tải trạng thái giám sát.');
        if (active) {
          setSnapshot(data);
          setError('');
        }
      } catch (requestError) {
        if (active && !controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : 'Không thể tải trạng thái giám sát.');
        }
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  const redisStatus = snapshot?.redis.status ?? 'unavailable';
  const circuitOpen = snapshot?.databaseCircuit.state === 'open';

  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title">
          <div><p className="eyebrow">Vận hành · APM</p><h1>Giám sát hệ thống</h1></div>
          <button type="button" className="secondary-action" onClick={() => { setLoading(true); setRefreshKey((value) => value + 1); }} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" /> Làm mới
          </button>
        </div>
        {error && <p className="admin-return-alert" role="alert">{error}</p>}
        {loading && !snapshot && <p className="empty-state" role="status">Đang kiểm tra các dịch vụ...</p>}
        <div className="admin-kpi-grid admin-health-grid">
          <article className="admin-kpi-card">
            <span><Database size={16} aria-hidden="true" /> Database</span>
            <strong className={snapshot?.database === 'healthy' ? 'health-good' : 'health-bad'}>{statusLabel(snapshot?.database ?? 'unavailable')}</strong>
            <small>{snapshot?.databaseLatencyMs == null ? 'Chưa đo được độ trễ' : `${snapshot.databaseLatencyMs} ms`}</small>
          </article>
          <article className="admin-kpi-card">
            <span><Wifi size={16} aria-hidden="true" /> Redis</span>
            <strong className={redisStatus === 'healthy' ? 'health-good' : redisStatus === 'unavailable' ? 'health-bad' : ''}>{statusLabel(redisStatus)}</strong>
            <small>{snapshot?.redis.latencyMs == null ? 'Upstash REST' : `${snapshot.redis.latencyMs} ms`}</small>
          </article>
          <article className="admin-kpi-card">
            <span><Activity size={16} aria-hidden="true" /> Database-backed API</span>
            <strong>{snapshot?.api.sampleCount ?? '—'}</strong>
            <small>Trong {snapshot?.api.windowMinutes ?? 15} phút gần nhất</small>
          </article>
          <article className="admin-kpi-card">
            <span><CircleAlert size={16} aria-hidden="true" /> Lỗi request</span>
            <strong>{snapshot?.api.totalErrors ?? '—'}</strong>
            <small>4xx: {snapshot?.api.errors4xx ?? '—'} · 5xx: {snapshot?.api.errors5xx ?? '—'}</small>
          </article>
          <article className="admin-kpi-card">
            <span><Server size={16} aria-hidden="true" /> Độ trễ API</span>
            <strong>{snapshot?.api.averageLatencyMs == null ? '—' : `${snapshot.api.averageLatencyMs} ms`}</strong>
            <small>Tỷ lệ 5xx: {snapshot?.api.errorRate5xxPercent == null ? 'Chưa đủ mẫu' : `${snapshot.api.errorRate5xxPercent}%`}</small>
          </article>
          <article className="admin-kpi-card">
            <span><Activity size={16} aria-hidden="true" /> Database circuit</span>
            <strong className={circuitOpen ? 'health-bad' : 'health-good'}>{circuitOpen ? 'Đang mở' : 'Đóng'}</strong>
            <small>{snapshot?.databaseCircuit.retryInMs ? `Thử lại sau ${Math.ceil(snapshot.databaseCircuit.retryInMs / 1000)} giây` : 'Cho phép request'}</small>
          </article>
        </div>
        <p className="monitoring-footnote">
          Metrics ghi nhận từ các API dùng withDatabase, lưu trong bộ nhớ tiến trình hiện tại. Cập nhật mỗi 15 giây
          {snapshot ? ` · Lần đo gần nhất ${new Date(snapshot.measuredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : ''}.
        </p>
      </section>
    </main>
  );
}