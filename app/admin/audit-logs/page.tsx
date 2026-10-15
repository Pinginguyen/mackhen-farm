import Link from 'next/link';

import { fetchApiWithFallback } from '@/lib/server-api';

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

function displayValue(value: unknown) {
  if (value == null) return '—';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export default async function AdminAuditLogsPage() {
  const { data, unavailable } = await fetchApiWithFallback<{ items: AuditEntry[] }>('/api/admin/audit-logs', { items: [] });
  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title"><div><p className="eyebrow">Minh bạch vận hành</p><h1>Nhật ký thao tác Admin</h1></div><Link className="secondary-action" href="/admin">Tổng quan</Link></div>
        {unavailable && <p className="empty-state" role="status">Không thể tải audit log khi cơ sở dữ liệu chưa kết nối.</p>}
        <div className="table-card admin-audit-table">
          <table>
            <thead><tr><th>Thời gian</th><th>Admin</th><th>Hành động</th><th>Đối tượng</th><th>Giá trị cũ</th><th>Giá trị mới</th><th>IP</th></tr></thead>
            <tbody>{data.items.map((entry) => <tr key={entry.id}>
              <td>{new Date(entry.createdAt).toLocaleString('vi-VN')}</td><td>{entry.adminEmail}</td><td><code>{entry.action}</code></td>
              <td>{entry.targetEntity} · {entry.targetId}</td><td>{displayValue(entry.oldValue)}</td><td>{displayValue(entry.newValue)}</td><td>{entry.ipAddress ?? '—'}</td>
            </tr>)}
            {!data.items.length && <tr><td colSpan={7}>Chưa có thao tác được ghi nhận.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}