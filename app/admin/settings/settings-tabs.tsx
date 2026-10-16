'use client';

import { useState } from 'react';

export type AuditEntry = {
  id: string;
  adminEmail: string;
  action: string;
  targetEntity: string;
  targetId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
};

export type MonitoringData = {
  database: string;
  databaseLatencyMs: number | null;
  connectionPooler: string;
  api: { sampleCount: number; averageLatencyMs: number | null; errors500: number; errors504: number; errorRate5xxPercent: number | null; windowMinutes: number };
  measuredAt: string;
};

const tabs = [
  { id: 'general', label: 'Cài đặt chung' },
  { id: 'audit', label: 'Nhật ký Audit' },
  { id: 'monitoring', label: 'Giám sát hệ thống' },
] as const;

function displayValue(value: unknown) {
  if (value == null) return '—';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export default function SettingsTabs({ defaultTab, appUrl, bank, auditEntries, auditUnavailable, monitoring, monitoringUnavailable }: {
  defaultTab: 'general' | 'audit' | 'monitoring';
  appUrl: string;
  bank: string;
  auditEntries: AuditEntry[];
  auditUnavailable: boolean;
  monitoring: MonitoringData;
  monitoringUnavailable: boolean;
}) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  return <div className="admin-settings-tabs">
    <div className="admin-settings-tab-list" role="tablist" aria-label="Các phần cài đặt">
      {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`settings-panel-${tab.id}`} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
    </div>
    {activeTab === 'general' && <section id="settings-panel-general" className="admin-settings-tab-panel" role="tabpanel">
      <div className="settings-list"><div><span>Thanh toán VietQR / SePay</span><strong>Đang dùng QR chuyển khoản trực tiếp · SePay tự động xác nhận</strong></div><div><span>Ngân hàng VietQR</span><strong>{bank}</strong></div><div><span>URL ứng dụng</span><strong>{appUrl}</strong></div></div>
      <p className="settings-note">Thông tin nhạy cảm được quản lý qua biến môi trường và không hiển thị trong portal.</p>
    </section>}
    {activeTab === 'audit' && <section id="settings-panel-audit" className="admin-settings-tab-panel" role="tabpanel">
      {auditUnavailable && <p className="empty-state" role="status">Không thể tải audit log khi cơ sở dữ liệu chưa kết nối.</p>}
      <div className="table-card admin-audit-table"><table><thead><tr><th>Thời gian</th><th>Admin</th><th>Hành động</th><th>Đối tượng</th><th>Giá trị cũ</th><th>Giá trị mới</th><th>IP</th></tr></thead>
        <tbody>{auditEntries.map((entry) => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString('vi-VN')}</td><td>{entry.adminEmail}</td><td><code>{entry.action}</code></td><td>{entry.targetEntity} · {entry.targetId}</td><td>{displayValue(entry.oldValue)}</td><td>{displayValue(entry.newValue)}</td><td>{entry.ipAddress ?? '—'}</td></tr>)}
          {!auditEntries.length && <tr><td colSpan={7}>Chưa có thao tác được ghi nhận.</td></tr>}</tbody>
      </table></div>
    </section>}
    {activeTab === 'monitoring' && <section id="settings-panel-monitoring" className="admin-settings-tab-panel" role="tabpanel">
      {monitoringUnavailable && <p className="empty-state" role="status">Không thể đọc số liệu giám sát từ database hiện tại.</p>}
      <div className="admin-kpi-grid admin-health-grid">
        <article className="admin-kpi-card"><span>Neon PostgreSQL</span><strong className={monitoring.database === 'healthy' ? 'health-good' : 'health-bad'}>{monitoring.database === 'healthy' ? 'Kết nối tốt' : 'Không khả dụng'}</strong><small>{monitoring.databaseLatencyMs == null ? 'Chưa đo được độ trễ' : `${monitoring.databaseLatencyMs} ms`}</small></article>
        <article className="admin-kpi-card"><span>API latency trung bình</span><strong>{monitoring.api.averageLatencyMs == null ? '—' : `${monitoring.api.averageLatencyMs} ms`}</strong><small>{monitoring.api.sampleCount} request trong {monitoring.api.windowMinutes} phút</small></article>
        <article className="admin-kpi-card"><span>Lỗi HTTP 500 / 504</span><strong>{monitoring.api.errors500} / {monitoring.api.errors504}</strong><small>Tỷ lệ 5xx: {monitoring.api.errorRate5xxPercent == null ? 'chưa đủ mẫu' : `${monitoring.api.errorRate5xxPercent}%`}</small></article>
        <article className="admin-kpi-card"><span>Connection pooler</span><strong>{monitoring.connectionPooler === 'pooler-configured' ? 'Đã phát hiện' : monitoring.connectionPooler === 'pooler-not-detected' ? 'Chưa phát hiện' : 'Không rõ'}</strong><small>DATABASE_URL</small></article>
      </div>
      <p className="monitoring-footnote">Số liệu API trong bộ nhớ tiến trình, cửa sổ {monitoring.api.windowMinutes} phút. Cập nhật lúc {new Date(monitoring.measuredAt).toLocaleString('vi-VN')}.</p>
    </section>}
  </div>;
}
