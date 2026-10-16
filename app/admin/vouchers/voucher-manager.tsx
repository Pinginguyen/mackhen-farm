'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

type Voucher = {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  usageLimit: number | null;
  expiresAt: string | null;
  isActive: boolean;
  usedCount: number;
  freeShipping: boolean;
  firstOrderOnly: boolean;
  showOnPromoPage: boolean;
};

type Draft = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: string;
  maxDiscount: string;
  minSpend: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
  freeShipping: boolean;
  firstOrderOnly: boolean;
  showOnPromoPage: boolean;
};

const emptyDraft: Draft = {
  code: '',
  discountType: 'PERCENTAGE',
  value: '10',
  maxDiscount: '',
  minSpend: '0',
  usageLimit: '',
  expiresAt: '',
  isActive: true,
  freeShipping: false,
  firstOrderOnly: false,
  showOnPromoPage: false,
};

function localDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function discountLabel(voucher: Voucher) {
  const value = voucher.discountType === 'PERCENTAGE' ? `${voucher.value}%` : formatMoney(voucher.value);
  return voucher.maxDiscount ? `${value} · tối đa ${formatMoney(voucher.maxDiscount)}` : value;
}

export default function VoucherManager({ initialVouchers }: { initialVouchers: Voucher[] }) {
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function startCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function startEdit(voucher: Voucher) {
    setEditingId(voucher.id);
    setDraft({
      code: voucher.code,
      discountType: voucher.discountType,
      value: String(voucher.value),
      maxDiscount: voucher.maxDiscount == null ? '' : String(voucher.maxDiscount),
      minSpend: String(voucher.minSpend),
      usageLimit: voucher.usageLimit == null ? '' : String(voucher.usageLimit),
      expiresAt: localDateTime(voucher.expiresAt),
      isActive: voucher.isActive,
      freeShipping: voucher.freeShipping,
      firstOrderOnly: voucher.firstOrderOnly,
      showOnPromoPage: voucher.showOnPromoPage,
    });
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  async function reloadVouchers() {
    const response = await fetch('/api/admin/vouchers', { cache: 'no-store' });
    const result = await response.json() as { items?: Voucher[]; error?: string };
    if (!response.ok || !result.items) throw new Error(result.error ?? 'Không thể tải danh sách voucher.');
    setVouchers(result.items);
  }

  async function saveVoucher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const payload = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      value: Number(draft.value),
      maxDiscount: draft.discountType === 'PERCENTAGE' && draft.maxDiscount ? Number(draft.maxDiscount) : null,
      minSpend: Number(draft.minSpend),
      usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
      ...(editingId ? { id: editingId } : {}),
    };

    try {
      const response = await fetch('/api/admin/vouchers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { item?: Voucher; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error ?? 'Không thể lưu voucher.');
      await reloadVouchers();
      setNotice(editingId ? `Đã cập nhật voucher ${result.item.code}.` : `Đã tạo voucher ${result.item.code}.`);
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu voucher.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteVoucher(voucher: Voucher) {
    if (!window.confirm(`Xóa voucher ${voucher.code}?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/vouchers?id=${encodeURIComponent(voucher.id)}`, { method: 'DELETE' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Không thể xóa voucher.');
      await reloadVouchers();
      setNotice(`Đã xóa voucher ${voucher.code}.`);
      if (editingId === voucher.id) setFormOpen(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa voucher.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-voucher-manager" aria-label="Quản lý voucher">
      <div className="admin-voucher-toolbar">
        <p>{vouchers.length} voucher</p>
        <button className="primary-action" type="button" onClick={startCreate}><Plus size={17} /> Tạo voucher</button>
      </div>

      {error && <p className="admin-voucher-error" role="alert">{error}</p>}
      {notice && <p className="admin-voucher-notice" role="status">{notice}</p>}

      {formOpen && <form className="admin-voucher-form" onSubmit={saveVoucher}>
        <header><h2>{editingId ? 'Sửa voucher' : 'Tạo voucher'}</h2><button type="button" className="admin-voucher-close" aria-label="Đóng biểu mẫu" onClick={() => setFormOpen(false)} disabled={busy}><X size={18} /></button></header>
        <div className="admin-voucher-fields">
          <label className="field">Mã voucher<input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} minLength={3} maxLength={32} required placeholder="TET2026" /></label>
          <label className="field">Loại giảm giá<select value={draft.discountType} onChange={(event) => setDraft((current) => ({ ...current, discountType: event.target.value as Draft['discountType'], freeShipping: event.target.value === 'FIXED' && current.freeShipping }))}><option value="PERCENTAGE">Giảm phần trăm (%)</option><option value="FIXED">Giảm số tiền cố định (đ)</option></select></label>
          <label className="field">Giá trị giảm<input type="number" min="1" max={draft.discountType === 'PERCENTAGE' ? 100 : undefined} step="1" value={draft.value} onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))} required /></label>
          {draft.discountType === 'PERCENTAGE' && <label className="field">Mức giảm tối đa (đ)<input type="number" min="1" step="1" value={draft.maxDiscount} onChange={(event) => setDraft((current) => ({ ...current, maxDiscount: event.target.value }))} required placeholder="Bắt buộc" /></label>}
          <label className="field">Đơn tối thiểu (đ)<input type="number" min="0" step="1000" value={draft.minSpend} onChange={(event) => setDraft((current) => ({ ...current, minSpend: event.target.value }))} required /></label>
          <label className="field">Giới hạn lượt dùng<input type="number" min="1" step="1" value={draft.usageLimit} onChange={(event) => setDraft((current) => ({ ...current, usageLimit: event.target.value }))} placeholder="Không giới hạn" /></label>
          <label className="field">Hạn sử dụng<input type="datetime-local" value={draft.expiresAt} onChange={(event) => setDraft((current) => ({ ...current, expiresAt: event.target.value }))} required /></label>
        </div>
        <div className="admin-voucher-options">
          {draft.discountType === 'FIXED' && <label><input type="checkbox" checked={draft.freeShipping} onChange={(event) => setDraft((current) => ({ ...current, freeShipping: event.target.checked }))} /> Miễn phí vận chuyển</label>}
          <label><input type="checkbox" checked={draft.firstOrderOnly} onChange={(event) => setDraft((current) => ({ ...current, firstOrderOnly: event.target.checked }))} /> Chỉ áp dụng đơn đầu tiên</label>
          <label><input type="checkbox" checked={draft.showOnPromoPage} onChange={(event) => setDraft((current) => ({ ...current, showOnPromoPage: event.target.checked }))} /> Hiển thị công khai trên trang Khuyến mãi</label>
          <label><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} /> Đang bật</label>
        </div>
        <footer><button className="secondary-action" type="button" onClick={() => setFormOpen(false)} disabled={busy}>Hủy</button><button className="primary-action" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo voucher'}</button></footer>
      </form>}

      <div className="table-card admin-voucher-table-wrap">
        <table className="admin-voucher-table">
          <thead><tr><th>Mã</th><th>Mức giảm</th><th>Đơn tối thiểu</th><th>Trạng thái</th><th>Số lượt dùng</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody>
            {vouchers.map((voucher) => {
              const expired = voucher.expiresAt !== null && Date.parse(voucher.expiresAt) <= Date.now();
              return <tr key={voucher.id}>
                <td><strong>{voucher.code}</strong>{voucher.firstOrderOnly && <small>Đơn đầu tiên</small>}{voucher.showOnPromoPage && <small>Hiển thị công khai</small>}</td>
                <td>{voucher.freeShipping ? 'Miễn phí vận chuyển' : discountLabel(voucher)}</td>
                <td>{formatMoney(voucher.minSpend)}</td>
                <td><span className={`admin-voucher-status${voucher.isActive && !expired ? ' is-active' : ''}`}>{expired ? 'Hết hạn' : voucher.isActive ? 'Đang bật' : 'Đã tắt'}</span></td>
                <td>{voucher.usedCount.toLocaleString('vi-VN')}{voucher.usageLimit != null ? ` / ${voucher.usageLimit.toLocaleString('vi-VN')}` : ''}</td>
                <td className="admin-voucher-actions"><button type="button" onClick={() => startEdit(voucher)} disabled={busy} aria-label={`Sửa ${voucher.code}`}><Pencil size={16} /></button><button type="button" onClick={() => void deleteVoucher(voucher)} disabled={busy} aria-label={`Xóa ${voucher.code}`}><Trash2 size={16} /></button></td>
              </tr>;
            })}
            {!vouchers.length && <tr><td colSpan={6} className="admin-voucher-empty">Chưa có voucher nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}