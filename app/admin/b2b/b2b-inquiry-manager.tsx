'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

type InquiryStatus = 'PENDING' | 'CONTACTED' | 'RESOLVED' | 'CANCELLED';
type Inquiry = {
  id: string;
  companyName: string;
  country: string;
  contactName: string;
  email: string;
  phone: string | null;
  expectedVolume: string;
  message: string | null;
  adminNotes: string | null;
  status: InquiryStatus;
  createdAt: string;
};

const statuses: { value: InquiryStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'CONTACTED', label: 'Đã liên hệ' },
  { value: 'RESOLVED', label: 'Đã hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export default function B2bInquiryManager() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, InquiryStatus>>({});
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pageSize = 20;

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status) params.set('status', status);
      if (search.trim()) params.set('q', search.trim());

      try {
        const response = await fetch(`/api/admin/b2b/inquiries?${params}`, { cache: 'no-store', signal: controller.signal });
        const result = await response.json() as {
          items?: Inquiry[];
          pagination?: { total: number; totalPages: number };
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(result.error?.message ?? 'Không thể tải yêu cầu B2B.');
        setItems(result.items ?? []);
        setTotal(result.pagination?.total ?? 0);
        setTotalPages(result.pagination?.totalPages ?? 1);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== 'AbortError') {
          setError(requestError.message || 'Không thể tải yêu cầu B2B.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [page, search, status]);

  async function updateStatus(inquiry: Inquiry) {
    const nextStatus = draftStatuses[inquiry.id] ?? inquiry.status;
    if (nextStatus === inquiry.status) return;
    setPendingId(inquiry.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/b2b/inquiries/${encodeURIComponent(inquiry.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json() as { item?: { status: InquiryStatus }; error?: { message?: string } };
      if (!response.ok || !result.item) throw new Error(result.error?.message ?? 'Không thể cập nhật trạng thái.');
      setItems((current) => current.map((item) => item.id === inquiry.id ? { ...item, status: result.item!.status } : item));
      setDraftStatuses((current) => ({ ...current, [inquiry.id]: result.item!.status }));
      setNotice(`Đã cập nhật trạng thái yêu cầu của ${inquiry.companyName}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật trạng thái.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="admin-b2b-manager" aria-label="Quản lý yêu cầu B2B">
      <div className="admin-b2b-toolbar">
        <label className="admin-b2b-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Tìm yêu cầu B2B</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tên công ty, người liên hệ hoặc điện thoại" /></label>
        <label className="field">Trạng thái<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div>
      {error && <p className="admin-return-alert" role="alert">{error}</p>}
      {notice && <p className="admin-return-notice" role="status">{notice}</p>}
      <div className="admin-order-pagination">
        <p className="admin-order-result-count">{loading ? 'Đang tải yêu cầu...' : `${total.toLocaleString('vi-VN')} yêu cầu`}</p>
        <button type="button" className="secondary-action" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page <= 1}>Trước</button>
        <span>Trang {page} / {totalPages}</span>
        <button type="button" className="secondary-action" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={loading || page >= totalPages}>Sau</button>
      </div>
      <div className="admin-return-table-wrap">
        <table className="admin-return-table admin-b2b-table">
          <thead><tr><th>Công ty</th><th>Người liên hệ</th><th>Quốc gia</th><th>Nhu cầu</th><th>Ngày gửi</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody>
            {items.map((inquiry) => <tr key={inquiry.id}>
              <td><strong>{inquiry.companyName}</strong>{inquiry.message && <small className="admin-b2b-message">{inquiry.message}</small>}</td>
              <td>{inquiry.contactName}<small><a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>{inquiry.phone && <> · <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a></>}</small></td>
              <td>{inquiry.country}</td>
              <td>{inquiry.expectedVolume}</td>
              <td>{new Date(inquiry.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
              <td><label className="sr-only" htmlFor={`b2b-status-${inquiry.id}`}>Trạng thái {inquiry.companyName}</label><select id={`b2b-status-${inquiry.id}`} value={draftStatuses[inquiry.id] ?? inquiry.status} onChange={(event) => setDraftStatuses((current) => ({ ...current, [inquiry.id]: event.target.value as InquiryStatus }))}>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></td>
              <td><button className="admin-b2b-save" type="button" onClick={() => void updateStatus(inquiry)} disabled={pendingId === inquiry.id || (draftStatuses[inquiry.id] ?? inquiry.status) === inquiry.status}>{pendingId === inquiry.id ? 'Đang lưu...' : 'Cập nhật'}</button></td>
            </tr>)}
            {!loading && !items.length && <tr><td className="admin-b2b-empty" colSpan={7}>Không có yêu cầu B2B phù hợp.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}