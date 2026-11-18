'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

type AuditEntry = {
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

function formatAuditValue(value: unknown): string {
  if (value == null) return '—';
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return serialized.length > 240 ? `${serialized.slice(0, 237)}...` : serialized;
}

export default function AdminAuditLogsPage() {
  const [adminEmail, setAdminEmail] = useState('');
  const [actionType, setActionType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchVersion, setSearchVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ pageSize: '100' });
    if (adminEmail.trim()) params.set('adminEmail', adminEmail.trim());
    if (actionType) params.set('actionType', actionType);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    setLoading(true);
    setError('');
    void fetch(`/api/admin/audit-logs?${params}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { items?: AuditEntry[]; error?: { message?: string } };
        if (!response.ok) throw new Error(result.error?.message ?? 'Không thể tải nhật ký kiểm toán.');
        setEntries(result.items ?? []);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'Không thể tải nhật ký kiểm toán.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [actionType, adminEmail, dateFrom, dateTo, searchVersion]);

  return (
    <main className="page-shell">
      <section className="page-card admin-audit-page">
        <div className="page-title"><div><p className="eyebrow">Bảo mật · Chủ doanh nghiệp</p><h1>Nhật ký kiểm toán</h1></div></div>
        <form className="admin-audit-filters" onSubmit={(event) => { event.preventDefault(); setSearchVersion((value) => value + 1); }}>
          <label>Email quản trị<input type="search" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@example.com" /></label>
          <label>Loại hành động<select value={actionType} onChange={(event) => setActionType(event.target.value)}><option value="">Tất cả</option><option value="CREATE">Tạo</option><option value="UPDATE">Cập nhật</option><option value="DELETE">Xóa</option></select></label>
          <label>Từ ngày<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label>Đến ngày<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
          <button type="submit" className="secondary-action"><Search size={16} aria-hidden="true" /> Lọc nhật ký</button>
        </form>
        {error && <p className="admin-return-alert" role="alert">{error}</p>}
        <div className="table-card admin-audit-table mobile-table-scroll">
          <table><thead><tr><th>Thời gian</th><th>Email quản trị</th><th>Hành động</th><th>Đối tượng</th><th>IP</th><th>Trước đó</th><th>Sau khi đổi</th></tr></thead>
            <tbody>{entries.map((entry) => <tr key={entry.id}>
              <td>{new Date(entry.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
              <td>{entry.adminEmail}</td>
              <td><span className={`audit-action-badge ${entry.action.startsWith('DELETE') ? 'audit-action-badge--return' : entry.action.startsWith('CREATE') ? 'audit-action-badge--product' : 'audit-action-badge--order'}`}>{entry.action}</span></td>
              <td>{entry.targetEntity} · {entry.targetId}</td>
              <td><code>{entry.ipAddress ?? '—'}</code></td>
              <td><code>{formatAuditValue(entry.oldValue)}</code></td>
              <td><code>{formatAuditValue(entry.newValue)}</code></td>
            </tr>)}
              {loading && <tr><td colSpan={7}>Đang tải nhật ký...</td></tr>}
              {!loading && !entries.length && <tr><td colSpan={7}>Không có bản ghi phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}