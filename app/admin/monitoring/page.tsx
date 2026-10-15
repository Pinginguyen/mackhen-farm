import Link from 'next/link';

import { fetchApiWithFallback } from '@/lib/server-api';

type MonitoringData = {
  database: string;
  databaseLatencyMs: number | null;
  connectionPooler: string;
  api: { sampleCount: number; averageLatencyMs: number | null; errors500: number; errors504: number; errorRate5xxPercent: number | null; windowMinutes: number };
  measuredAt: string;
};

export default async function AdminMonitoringPage() {
  const { data, unavailable } = await fetchApiWithFallback<MonitoringData>('/api/admin/monitoring', {
    database: 'unavailable', databaseLatencyMs: null, connectionPooler: 'unknown',
    api: { sampleCount: 0, averageLatencyMs: null, errors500: 0, errors504: 0, errorRate5xxPercent: null, windowMinutes: 15 },
    measuredAt: new Date().toISOString(),
  });
  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title"><div><p className="eyebrow">Hạ tầng & độ tin cậy</p><h1>Giám sát hệ thống</h1></div><Link className="secondary-action" href="/admin">Dashboard</Link></div>
        {unavailable && <p className="empty-state" role="status">Không thể đọc số liệu giám sát từ database hiện tại.</p>}
        <div className="admin-kpi-grid admin-health-grid">
          <article className="admin-kpi-card"><span>Neon PostgreSQL</span><strong className={data.database === 'healthy' ? 'health-good' : 'health-bad'}>{data.database === 'healthy' ? 'Kết nối tốt' : 'Không khả dụng'}</strong><small>{data.databaseLatencyMs == null ? 'Chưa đo được độ trễ' : `${data.databaseLatencyMs} ms`}</small></article>
          <article className="admin-kpi-card"><span>API latency trung bình</span><strong>{data.api.averageLatencyMs == null ? '—' : `${data.api.averageLatencyMs} ms`}</strong><small>{data.api.sampleCount} request được đo trong {data.api.windowMinutes} phút</small></article>
          <article className="admin-kpi-card"><span>Lỗi HTTP 500 / 504</span><strong>{data.api.errors500} / {data.api.errors504}</strong><small>Tỷ lệ 5xx: {data.api.errorRate5xxPercent == null ? 'chưa đủ mẫu' : `${data.api.errorRate5xxPercent}%`}</small></article>
          <article className="admin-kpi-card"><span>Connection pooler</span><strong>{data.connectionPooler === 'pooler-configured' ? 'Đã phát hiện' : data.connectionPooler === 'pooler-not-detected' ? 'Chưa phát hiện' : 'Không rõ'}</strong><small>Kiểm tra cấu hình DATABASE_URL</small></article>
        </div>
        <p className="monitoring-footnote">Số liệu API được lưu trong bộ nhớ tiến trình hiện tại, cửa sổ {data.api.windowMinutes} phút. Cập nhật lúc {new Date(data.measuredAt).toLocaleString('vi-VN')}.</p>
      </section>
    </main>
  );
}