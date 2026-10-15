'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Check, Clock3, Copy, Image as ImageIcon, PackageCheck, Sparkles, Wallet, X, XCircle } from 'lucide-react';

type ReturnStatus = 'PENDING' | 'REPLACEMENT_APPROVED' | 'VOUCHER_ISSUED' | 'REFUND_APPROVED' | 'REFUNDED' | 'REJECTED';

type ReturnRequest = {
  id: string;
  orderId: string;
  customerPhone: string;
  issueType: string;
  description: string;
  imageUrl: string | null;
  refundBankName: string | null;
  refundAccountNumber: string | null;
  refundAccountHolder: string | null;
  status: ReturnStatus;
  adminNote: string | null;
  refundApprovedBy: string | null;
  refundApprovedAt: string | null;
  refundTransferReference: string | null;
  riskTag: string | null;
  compensationVoucher?: { code: string; discountPercent: number; expiresAt: string; redeemedAt: string | null } | null;
  createdAt: string;
  order: { orderCode: string; customerName: string };
};

const statusTabs: { id: 'ALL' | ReturnStatus; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'REPLACEMENT_APPROVED', label: 'Đã duyệt gửi bù' },
  { id: 'VOUCHER_ISSUED', label: 'Đã phát hành voucher' },
  { id: 'REFUND_APPROVED', label: 'Chờ chuyển hoàn' },
  { id: 'REFUNDED', label: 'Đã hoàn tiền' },
  { id: 'REJECTED', label: 'Từ chối' },
];

const statusLabels: Record<ReturnStatus, string> = {
  PENDING: 'Chờ duyệt',
  REPLACEMENT_APPROVED: 'Đã duyệt gửi bù',
  VOUCHER_ISSUED: 'Đã phát hành voucher 50%',
  REFUND_APPROVED: 'Đã duyệt · chờ chuyển tiền',
  REFUNDED: 'Đã hoàn tiền',
  REJECTED: 'Đã từ chối',
};

export default function ReturnRequestsManager() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [filter, setFilter] = useState<'ALL' | ReturnStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [refundTransferReference, setRefundTransferReference] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedRefundField, setCopiedRefundField] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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
    setRefundTransferReference(request.refundTransferReference ?? '');
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
        body: JSON.stringify({ id: selected.id, status, adminNote, refundTransferReference }),
      });
      const result = await response.json() as { item?: ReturnRequest; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error ?? 'Không thể cập nhật yêu cầu.');

      const updated = result.item;
      setRequests((current) => current.map((request) => request.id === updated.id ? updated : request));
      setSelected(updated);
      setAdminNote(updated.adminNote ?? '');
      setRefundTransferReference(updated.refundTransferReference ?? '');
      setNotice(`Đã cập nhật yêu cầu ${updated.order.orderCode}: ${statusLabels[updated.status]}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật yêu cầu.');
    } finally {
      setBusy(false);
    }
  }

  async function copyRefundField(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedRefundField(label);
      setError('');
      setNotice(`Đã sao chép ${label.toLocaleLowerCase('vi')}.`);
    } catch {
      setCopiedRefundField(null);
      setError('Không thể sao chép tự động. Vui lòng chọn và sao chép thông tin thủ công.');
    }
  }

  async function analyzeSentiment() {
    setAnalyzing(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/ai-sentiment', { method: 'POST' });
      const result = await response.json() as { message?: string; source?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Không thể phân tích nội dung mới.');
      const refreshed = await fetch('/api/returns', { cache: 'no-store' });
      const queue = await refreshed.json() as { items?: ReturnRequest[]; error?: string };
      if (!refreshed.ok) throw new Error(queue.error ?? 'Đã phân tích nhưng không tải lại được hàng đợi.');
      setRequests(queue.items ?? []);
      setNotice(`${result.message ?? 'Đã phân tích hàng đợi.'} Nguồn: ${result.source === 'gemini' ? 'Gemini' : 'từ khóa dự phòng'}.`);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Không thể phân tích nội dung mới.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="admin-return-manager">
      <div className="admin-return-toolbar">
        <button className="admin-sentiment-button" type="button" onClick={() => void analyzeSentiment()} disabled={analyzing || busy}>
          <Sparkles size={16} />{analyzing ? 'Đang phân tích...' : 'Phân tích phản hồi mới'}
        </button>
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
              <th>Ưu tiên</th>
              <th>Ảnh minh chứng</th>
              <th>Thời gian gửi</th>
              <th>Trạng thái</th>
              <th><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleRequests.map((request) => (
              <tr key={request.id} className={request.riskTag === 'URGENT_QUALITY_RISK' ? 'admin-return-urgent-row' : undefined}>
                <td><strong>{request.order.orderCode}</strong></td>
                <td>
                  <span className="admin-return-customer">{request.order.customerName}</span>
                  <small>{request.customerPhone}</small>
                </td>
                <td>{request.issueType}</td>
                <td>{request.riskTag === 'URGENT_QUALITY_RISK' ? <span className="admin-return-risk urgent"><AlertTriangle size={14} /> Khẩn cấp · nguy cơ chất lượng</span> : request.riskTag === 'ROUTINE' ? <span className="admin-return-risk">Thông thường</span> : <span className="admin-return-risk">Chưa phân tích</span>}</td>
                <td>
                  {request.imageUrl ? (
                    <button className="admin-return-thumbnail" type="button" onClick={() => setImagePreview(request.imageUrl)} aria-label={`Phóng to ảnh minh chứng đơn ${request.order.orderCode}`}>
                      <Image src={request.imageUrl} alt={`Minh chứng ${request.order.orderCode}`} width={64} height={64} sizes="64px" unoptimized />
                    </button>
                  ) : <span className="admin-return-no-image">Không có ảnh</span>}
                </td>
                <td>{new Date(request.createdAt).toLocaleString('vi-VN')}</td>
                <td><span className={`return-admin-status ${request.status.toLowerCase()}`}>{statusLabels[request.status]}</span></td>
                <td><button className="admin-return-action" type="button" onClick={() => openRequest(request)}>Xử lý</button></td>
              </tr>
            ))}
            {!loading && !visibleRequests.length && (
              <tr><td className="admin-return-empty" colSpan={8}>{requests.length ? 'Không có yêu cầu phù hợp bộ lọc.' : 'Chưa có yêu cầu đổi trả nào.'}</td></tr>
            )}
            {loading && <tr><td className="admin-return-empty" colSpan={8}>Đang tải yêu cầu...</td></tr>}
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
              <section className="admin-return-refund-info" aria-labelledby="admin-return-refund-title">
                <div>
                  <h3 id="admin-return-refund-title">Thông tin nhận hoàn tiền</h3>
                  <p>Chỉ dùng khi xử lý hoàn tiền cho yêu cầu này.</p>
                </div>
                {selected.refundBankName && selected.refundAccountNumber && selected.refundAccountHolder ? (
                  <div className="admin-return-refund-fields">
                    {[
                      ['Ngân hàng / Ví', selected.refundBankName],
                      ['Số tài khoản / SĐT ví', selected.refundAccountNumber],
                      ['Chủ tài khoản', selected.refundAccountHolder],
                    ].map(([label, value]) => (
                      <div className="admin-return-refund-field" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <button className="admin-return-copy-button" type="button" onClick={() => void copyRefundField(label, value)} aria-label={`Sao chép ${label}`} title={`Sao chép ${label}`}>
                          {copiedRefundField === label ? <Check size={15} /> : <Copy size={15} />}
                          <span>{copiedRefundField === label ? 'Đã sao chép' : 'Sao chép'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-return-refund-empty">Khách chưa cung cấp đủ thông tin nhận hoàn tiền.</p>
                )}
              </section>
              {selected.compensationVoucher && <section className="admin-return-refund-info" aria-label="Voucher bồi thường đã phát hành">
                <div><h3>Voucher bồi thường {selected.compensationVoucher.discountPercent}%</h3><p>Đơn dùng một lần · hết hạn {new Date(selected.compensationVoucher.expiresAt).toLocaleDateString('vi-VN')}</p></div>
                <div className="admin-return-refund-field"><strong>{selected.compensationVoucher.code}</strong><button className="admin-return-copy-button" type="button" onClick={() => void copyRefundField('Mã voucher', selected.compensationVoucher!.code)}><Copy size={15} /><span>Sao chép mã</span></button></div>
              </section>}
              {selected.status === 'REFUND_APPROVED' && <>
                <p className="admin-return-action-note">Đã được {selected.refundApprovedBy ?? 'Admin'} phê duyệt{selected.refundApprovedAt ? ` lúc ${new Date(selected.refundApprovedAt).toLocaleString('vi-VN')}` : ''}. Hãy thực hiện chuyển khoản ngoài hệ thống, sau đó nhập mã tham chiếu để xác nhận hoàn tất.</p>
                <label className="admin-return-admin-note">Mã tham chiếu giao dịch<input value={refundTransferReference} onChange={(event) => setRefundTransferReference(event.target.value)} maxLength={160} placeholder="Mã giao dịch ngân hàng / ví" required /></label>
              </>}
              <div className="admin-return-detail-description"><span>Mô tả chi tiết</span><p>{selected.description}</p></div>
              <div className="admin-return-detail-image">
                <span>Ảnh minh chứng</span>
                {selected.imageUrl ? (
                  <button type="button" onClick={() => setImagePreview(selected.imageUrl)} aria-label="Phóng to ảnh minh chứng">
                    <Image src={selected.imageUrl} alt={`Minh chứng đơn ${selected.order.orderCode}`} width={640} height={480} sizes="(max-width: 768px) 90vw, 640px" unoptimized />
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

            {selected.status === 'PENDING' && <p className="admin-return-action-note">Phê duyệt hoàn tiền chỉ tạo bước chờ chuyển khoản; Admin cần kiểm tra thông tin và tự xác nhận sau khi giao dịch thực tế hoàn tất.</p>}

            <footer className="admin-return-modal-actions">
              {selected.status === 'PENDING' ? (
                <>
                  <button className="admin-return-approve" type="button" onClick={() => void updateStatus('REPLACEMENT_APPROVED')} disabled={busy}>
                    <PackageCheck size={17} /> Duyệt gửi bù (Đơn 0đ)
                  </button>
                  <button className="admin-return-approve" type="button" onClick={() => void updateStatus('VOUCHER_ISSUED')} disabled={busy}>
                    <Wallet size={17} /> Phát hành voucher 50%
                  </button>
                  <button className="admin-return-refund" type="button" onClick={() => void updateStatus('REFUND_APPROVED')} disabled={busy || !selected.refundBankName || !selected.refundAccountNumber || !selected.refundAccountHolder}>
                    <Wallet size={17} /> Duyệt hoàn tiền
                  </button>
                  <button className="admin-return-reject" type="button" onClick={() => void updateStatus('REJECTED')} disabled={busy}>
                    <XCircle size={17} /> Từ chối
                  </button>
                </>
              ) : selected.status === 'REFUND_APPROVED' ? (
                <>
                  <span className="admin-return-processed"><Clock3 size={16} /> Đã duyệt · chờ xác nhận chuyển khoản</span>
                  <button className="admin-return-refund" type="button" onClick={() => void updateStatus('REFUNDED')} disabled={busy || !refundTransferReference.trim()}>
                    <Wallet size={17} /> Xác nhận đã chuyển hoàn
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
            <Image src={imagePreview} alt="Ảnh minh chứng phóng to" width={1200} height={900} sizes="90vw" unoptimized />
          </div>
        </div>
      )}
    </div>
  );
}