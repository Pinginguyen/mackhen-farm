'use client';

import { useEffect, useState } from 'react';
import { Check, Clock3, Image as ImageIcon, PackageCheck, Wallet, X, XCircle } from 'lucide-react';

type ReturnStatus = 'PENDING' | 'REPLACEMENT_APPROVED' | 'REFUNDED' | 'REJECTED';

type ReturnRequest = {
  id: string;
  orderId: string;
  customerPhone: string;
  issueType: string;
  description: string;
  imageUrl: string | null;
  status: ReturnStatus;
  adminNote: string | null;
  createdAt: string;
  order: { orderCode: string; customerName: string };
};

const statusTabs: { id: 'ALL' | ReturnStatus; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'REPLACEMENT_APPROVED', label: 'Đã duyệt gửi bù' },
  { id: 'REFUNDED', label: 'Đã hoàn tiền' },
  { id: 'REJECTED', label: 'Từ chối' },
];

const statusLabels: Record<ReturnStatus, string> = {
  PENDING: 'Chờ duyệt',
  REPLACEMENT_APPROVED: 'Đã duyệt gửi bù',
  REFUNDED: 'Đã hoàn tiền',
  REJECTED: 'Đã từ chối',
};

export default function ReturnRequestsManager() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [filter, setFilter] = useState<'ALL' | ReturnStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      try {
        const response = await fetch('/api/returns', { cache: 'no-store' });
        const result = await response.json() as { items?: ReturnRequest[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Không thể tải yêu cầu đổi trả.');
        if (active) setRequests(result.items ?? []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải yêu cầu đổi trả.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRequests();
    return () => { active = false; };
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase('vi');
  const visibleRequests = requests.filter((request) => {
    const matchesStatus = filter === 'ALL' || request.status === filter;
    const searchable = `${request.order.orderCode} ${request.order.customerName} ${request.customerPhone} ${request.issueType}`.toLocaleLowerCase('vi');
    return matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
  });

  function openRequest(request: ReturnRequest) {
    setSelected(request);
    setAdminNote(request.adminNote ?? '');
    setError('');
    setNotice('');
  }

  async function updateStatus(status: ReturnStatus) {
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/returns', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: selected.id, status, adminNote }),
      });
      const result = await response.json() as { item?: ReturnRequest; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error ?? 'Không thể cập nhật yêu cầu.');

      const updated = result.item;
      setRequests((current) => current.map((request) => request.id === updated.id ? updated : request));
      setSelected(updated);
      setAdminNote(updated.adminNote ?? '');
      setNotice(`Đã cập nhật yêu cầu ${updated.order.orderCode}: ${statusLabels[updated.status]}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật yêu cầu.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-return-manager">
      <div className="admin-return-toolbar">
        <div className="admin-return-tabs" role="tablist" aria-label="Lọc trạng thái yêu cầu đổi trả">
          {statusTabs.map((tab) => {
            const count = tab.id === 'ALL' ? requests.length : requests.filter((request) => request.status === tab.id).length;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                className={filter === tab.id ? 'is-active' : ''}
                key={tab.id}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}<span>{count}</span>
              </button>
            );
          })}
        </div>
        <label className="admin-return-search">
          <span className="sr-only">Tìm yêu cầu đổi trả</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã đơn, tên hoặc SĐT" />
        </label>
      </div>

      {error && !selected && <p className="admin-return-alert" role="alert">{error}</p>}
      {notice && !selected && <p className="admin-return-notice" role="status">{notice}</p>}

      <div className="admin-return-table-wrap">
        <table className="admin-return-table">
          <thead>
            <tr>
              <th>Mã đơn hàng</th>
              <th>Khách hàng</th>
              <th>Loại sự cố</th>
              <th>Ảnh minh chứng</th>
              <th>Thời gian gửi</th>
              <th>Trạng thái</th>
              <th><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleRequests.map((request) => (
              <tr key={request.id}>
                <td><strong>{request.order.orderCode}</strong></td>
                <td>
                  <span className="admin-return-customer">{request.order.customerName}</span>
                  <small>{request.customerPhone}</small>
                </td>
                <td>{request.issueType}</td>
                <td>
                  {request.imageUrl ? (
                    <button className="admin-return-thumbnail" type="button" onClick={() => setImagePreview(request.imageUrl)} aria-label={`Phóng to ảnh minh chứng đơn ${request.order.orderCode}`}>
                      <img src={request.imageUrl} alt={`Minh chứng ${request.order.orderCode}`} />
                    </button>
                  ) : <span className="admin-return-no-image">Không có ảnh</span>}
                </td>
                <td>{new Date(request.createdAt).toLocaleString('vi-VN')}</td>
                <td><span className={`return-admin-status ${request.status.toLowerCase()}`}>{statusLabels[request.status]}</span></td>
                <td><button className="admin-return-action" type="button" onClick={() => openRequest(request)}>Xử lý</button></td>
              </tr>
            ))}
            {!loading && !visibleRequests.length && (
              <tr><td className="admin-return-empty" colSpan={7}>{requests.length ? 'Không có yêu cầu phù hợp bộ lọc.' : 'Chưa có yêu cầu đổi trả nào.'}</td></tr>
            )}
            {loading && <tr><td className="admin-return-empty" colSpan={7}>Đang tải yêu cầu...</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="admin-return-modal-backdrop" onMouseDown={() => !busy && setSelected(null)}>
          <section className="admin-return-modal" role="dialog" aria-modal="true" aria-labelledby="admin-return-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="admin-return-modal-header">
              <div>
                <p className="eyebrow">Yêu cầu đổi trả · {selected.order.orderCode}</p>
                <h2 id="admin-return-modal-title">Chi tiết khiếu nại</h2>
              </div>
              <button type="button" className="admin-return-icon-button" aria-label="Đóng chi tiết" onClick={() => setSelected(null)} disabled={busy}><X size={19} /></button>
            </header>

            <div className="admin-return-details">
              <div className="admin-return-detail-pair"><span>Khách hàng</span><strong>{selected.order.customerName}</strong></div>
              <div className="admin-return-detail-pair"><span>Số điện thoại</span><a href={`tel:${selected.customerPhone}`}>{selected.customerPhone}</a></div>
              <div className="admin-return-detail-pair"><span>Loại sự cố</span><strong>{selected.issueType}</strong></div>
              <div className="admin-return-detail-pair"><span>Thời gian gửi</span><strong>{new Date(selected.createdAt).toLocaleString('vi-VN')}</strong></div>
              <div className="admin-return-detail-description"><span>Mô tả chi tiết</span><p>{selected.description}</p></div>
              <div className="admin-return-detail-image">
                <span>Ảnh minh chứng</span>
                {selected.imageUrl ? (
                  <button type="button" onClick={() => setImagePreview(selected.imageUrl)} aria-label="Phóng to ảnh minh chứng">
                    <img src={selected.imageUrl} alt={`Minh chứng đơn ${selected.order.orderCode}`} />
                  </button>
                ) : <p className="admin-return-no-image"><ImageIcon size={17} /> Khách chưa gửi ảnh minh chứng.</p>}
              </div>
              <label className="admin-return-admin-note">
                Ghi chú xử lý nội bộ
                <textarea rows={3} maxLength={4000} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Ghi lại phương án xử lý hoặc mã vận đơn gửi bù..." />
              </label>
            </div>

            {error && <p className="admin-return-alert" role="alert">{error}</p>}
            {notice && <p className="admin-return-notice" role="status">{notice}</p>}

            {selected.status === 'PENDING' && <p className="admin-return-action-note">Thao tác ghi nhận trạng thái xử lý. Tạo vận đơn gửi bù hoặc thực hiện giao dịch hoàn tiền theo quy trình vận hành.</p>}

            <footer className="admin-return-modal-actions">
              {selected.status === 'PENDING' ? (
                <>
                  <button className="admin-return-approve" type="button" onClick={() => void updateStatus('REPLACEMENT_APPROVED')} disabled={busy}>
                    <PackageCheck size={17} /> Duyệt gửi bù (Đơn 0đ)
                  </button>
                  <button className="admin-return-refund" type="button" onClick={() => void updateStatus('REFUNDED')} disabled={busy}>
                    <Wallet size={17} /> Hoàn tiền 100%
                  </button>
                  <button className="admin-return-reject" type="button" onClick={() => void updateStatus('REJECTED')} disabled={busy}>
                    <XCircle size={17} /> Từ chối
                  </button>
                </>
              ) : (
                <span className="admin-return-processed"><Check size={16} /> {statusLabels[selected.status]}</span>
              )}
              <button className="secondary-action" type="button" onClick={() => setSelected(null)} disabled={busy}>
                {busy ? <><Clock3 size={16} /> Đang cập nhật...</> : 'Đóng'}
              </button>
            </footer>
          </section>
        </div>
      )}

      {imagePreview && (
        <div className="admin-return-image-backdrop" onMouseDown={() => setImagePreview(null)}>
          <div className="admin-return-image-viewer" role="dialog" aria-modal="true" aria-label="Ảnh minh chứng" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="admin-return-icon-button" aria-label="Đóng ảnh" onClick={() => setImagePreview(null)}><X size={19} /></button>
            <img src={imagePreview} alt="Ảnh minh chứng phóng to" />
          </div>
        </div>
      )}
    </div>
  );
}