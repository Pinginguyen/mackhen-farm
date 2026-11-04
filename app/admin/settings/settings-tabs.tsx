'use client';

import Link from 'next/link';
import { Search, Tag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SystemSettings } from '@/lib/system-settings';

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

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return { value };
    }
    return { value };
  }
  return {};
}

function formatAuditValue(value: unknown): string {
  if (value == null) return '—';
  const formatted = typeof value === 'string' ? value : JSON.stringify(value);
  return formatted.length > 32 ? `${formatted.slice(0, 29)}...` : formatted;
}

function getChangedFields(entry: AuditEntry) {
  const previous = toRecord(entry.oldValue);
  const next = toRecord(entry.newValue);
  return [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]))
    .map((key) => ({ key, before: formatAuditValue(previous[key]), after: formatAuditValue(next[key]) }));
}

function getActionBadge(action: string, targetEntity: string) {
  const normalized = action.toUpperCase();
  if (normalized.includes('RETURN')) return { className: 'audit-action-badge--return', label: 'Hoàn trả hàng' };
  if (normalized.includes('VOUCHER') || normalized.includes('PROMO')) return { className: 'audit-action-badge--voucher', label: 'Khuyến mãi' };
  if (/PRODUCT|INVENTORY|STOCK|PRICE/.test(normalized) || targetEntity.toLowerCase().includes('product')) {
    return { className: 'audit-action-badge--product', label: 'Sản phẩm / Kho' };
  }
  if (normalized.includes('ORDER') || targetEntity.toLowerCase().includes('order')) {
    return { className: 'audit-action-badge--order', label: 'Cập nhật đơn hàng' };
  }
  return { className: 'audit-action-badge--other', label: action.replaceAll('_', ' ') };
}

function AuditTarget({ entry }: { entry: AuditEntry }) {
  const entity = entry.targetEntity.toLowerCase();
  if (entity.includes('order')) {
    return <Link className="audit-target-chip" href={`/admin/orders?search=${encodeURIComponent(entry.targetId)}`}><span aria-hidden="true">📦</span> Đơn {entry.targetId}</Link>;
  }
  if (entity.includes('product')) {
    return <span className="audit-target-chip" title={entry.targetId}><Tag size={13} aria-hidden="true" /> Sản phẩm ({entry.targetId.slice(0, 8)})</span>;
  }
  return <span className="audit-target-chip" title={entry.targetId}>{entry.targetEntity} · {entry.targetId.slice(0, 12)}</span>;
}

export default function SettingsTabs({ defaultTab, appUrl, bank, systemSettings, settingsUnavailable, auditEntries, auditUnavailable, monitoring, monitoringUnavailable }: {
  defaultTab: 'general' | 'audit' | 'monitoring';
  appUrl: string;
  bank: string;
  systemSettings: SystemSettings;
  settingsUnavailable: boolean;
  auditEntries: AuditEntry[];
  auditUnavailable: boolean;
  monitoring: MonitoringData;
  monitoringUnavailable: boolean;
}) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(String(systemSettings.freeShippingThreshold));
  const [tasteGuaranteeText, setTasteGuaranteeText] = useState(systemSettings.tasteGuaranteeText);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedAudit) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedAudit(null);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [selectedAudit]);

  async function saveSalesSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const threshold = Number(freeShippingThreshold);
    if (!Number.isSafeInteger(threshold) || threshold < 0 || threshold > 100_000_000 || !tasteGuaranteeText.trim()) {
      setSettingsFeedback({ type: 'error', text: 'Vui lòng nhập ngưỡng freeship hợp lệ và nội dung bảo hiểm vị giác.' });
      return;
    }
    setSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ freeShippingThreshold: threshold, tasteGuaranteeText: tasteGuaranteeText.trim() }),
      });
      const result = await response.json() as { settings?: SystemSettings; error?: string };
      if (!response.ok || !result.settings) throw new Error(result.error ?? 'Không thể lưu cài đặt.');
      setFreeShippingThreshold(String(result.settings.freeShippingThreshold));
      setTasteGuaranteeText(result.settings.tasteGuaranteeText);
      setSettingsFeedback({ type: 'success', text: 'Đã lưu chính sách bán hàng và chuyển đổi.' });
    } catch (error) {
      setSettingsFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Không thể lưu cài đặt.' });
    } finally {
      setSavingSettings(false);
    }
  }

  return <div className="admin-settings-tabs">
    <div className="admin-settings-tab-list" role="tablist" aria-label="Các phần cài đặt">
      {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`settings-panel-${tab.id}`} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
    </div>
    {activeTab === 'general' && <section id="settings-panel-general" className="admin-settings-tab-panel" role="tabpanel">
      <div className="settings-list"><div><span>Thanh toán VietQR / SePay</span><strong>Đang dùng QR chuyển khoản trực tiếp · SePay tự động xác nhận</strong></div><div><span>Ngân hàng VietQR</span><strong>{bank}</strong></div><div><span>URL ứng dụng</span><strong>{appUrl}</strong></div></div>
      <p className="settings-note">Thông tin nhạy cảm được quản lý qua biến môi trường và không hiển thị trong portal.</p>
      <form className="settings-cro-form" onSubmit={saveSalesSettings}>
        <div><p className="eyebrow">CRO · STOREFRONT</p><h2>CHÍNH SÁCH BÁN HÀNG &amp; CHUYỂN ĐỔI</h2></div>
        {settingsUnavailable && <p className="empty-state" role="status">Không thể tải cài đặt từ cơ sở dữ liệu.</p>}
        <label className="field">Ngưỡng Miễn Phí Vận Chuyển (VNĐ)<input type="number" min={0} max={100000000} step={1000} value={freeShippingThreshold} onChange={(event) => setFreeShippingThreshold(event.target.value)} required /></label>
        <label className="field">Nội dung Cam Kết Bảo hiểm Vị giác<textarea rows={3} maxLength={2000} value={tasteGuaranteeText} onChange={(event) => setTasteGuaranteeText(event.target.value)} required /></label>
        {settingsFeedback && <p className={settingsFeedback.type === 'success' ? 'settings-cro-success' : 'settings-cro-error'} role={settingsFeedback.type === 'success' ? 'status' : 'alert'}>{settingsFeedback.text}</p>}
        <button className="primary-action" type="submit" disabled={savingSettings || settingsUnavailable}>{savingSettings ? 'Đang lưu...' : 'Lưu cài đặt chính sách'}</button>
      </form>
    </section>}
    {activeTab === 'audit' && <section id="settings-panel-audit" className="admin-settings-tab-panel" role="tabpanel">
      {auditUnavailable && <p className="empty-state" role="status">Không thể tải audit log khi cơ sở dữ liệu chưa kết nối.</p>}
      <div className="table-card admin-audit-table"><table><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>IP</th><th>CHI TIẾT THAY ĐỔI</th></tr></thead>
        <tbody>{auditEntries.map((entry) => {
          const actionBadge = getActionBadge(entry.action, entry.targetEntity);
          const changedFields = getChangedFields(entry);
          const initials = entry.adminEmail.split('@')[0].slice(0, 1).toUpperCase() || 'A';
          const timestamp = new Date(entry.createdAt);
          return <tr key={entry.id}>
            <td><time className="audit-time" dateTime={entry.createdAt}><strong>{timestamp.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}</strong><span>{timestamp.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: 'short', year: 'numeric' })}</span></time></td>
            <td><div className="audit-actor"><span className="audit-actor-avatar" aria-hidden="true">{initials}</span><span className="audit-actor-email" title={entry.adminEmail}>{entry.adminEmail}</span></div></td>
            <td><span className={`audit-action-badge ${actionBadge.className}`}>{actionBadge.label}</span></td>
            <td><AuditTarget entry={entry} /></td>
            <td><code className="audit-ip-address">{entry.ipAddress ?? '—'}</code></td>
            <td><div className="audit-change-summary">
              {changedFields.length ? <>
                <div className="audit-change-fields">{changedFields.slice(0, 2).map((field) => <span className="audit-change-field" key={field.key}><strong>{field.key}:</strong> {field.before} <span aria-label="thành">→</span> {field.after}</span>)}{changedFields.length > 2 && <span className="audit-more-fields">+{changedFields.length - 2} trường khác</span>}</div>
              </> : <span className="audit-no-change">Không có trường thay đổi</span>}
              <button className="audit-diff-trigger" type="button" onClick={(event) => { returnFocusRef.current = event.currentTarget; setSelectedAudit(entry); }} aria-label={`Xem JSON diff: ${entry.action}`}><Search size={13} aria-hidden="true" /> Xem Diff JSON</button>
            </div></td>
          </tr>;
        })}
          {!auditEntries.length && <tr><td className="audit-empty-state" colSpan={6}>Chưa có thao tác được ghi nhận.</td></tr>}</tbody>
      </table></div>
      {selectedAudit && <div className="audit-diff-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAudit(null); }}>
        <section className="audit-diff-modal" role="dialog" aria-modal="true" aria-labelledby="audit-diff-title" aria-describedby="audit-diff-description">
          <header className="audit-diff-header"><div><p className="eyebrow">AUDIT EVENT · {selectedAudit.action}</p><h2 id="audit-diff-title">Chi tiết thay đổi</h2><p id="audit-diff-description">{selectedAudit.targetEntity} · {selectedAudit.targetId}</p></div><button ref={closeButtonRef} className="audit-diff-close" type="button" onClick={() => setSelectedAudit(null)} aria-label="Đóng JSON diff"><X size={18} /></button></header>
          <pre className="audit-diff-json">{JSON.stringify({ oldValue: selectedAudit.oldValue, newValue: selectedAudit.newValue }, null, 2)}</pre>
        </section>
      </div>}
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
