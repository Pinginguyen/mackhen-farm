'use client';

import { useEffect, useState } from 'react';
import { Check, Handshake, Plus, Wallet, X } from 'lucide-react';
import { formatCurrency } from '@/lib/store-data';

type AffiliateSummary = {
  id: string;
  name: string;
  email: string;
  affiliateCode: string;
  commissionRate: number;
  bankAccount: string;
  active: boolean;
  totalClicks: number;
  completedOrders: number;
  revenue: number;
  commission: number;
  commissionDue: number;
  commissionDueOrders: number;
};

const emptyDraft = { name: '', email: '', password: '', affiliateCode: '', commissionRate: '10', bankAccount: '' };

export default function AffiliateManager() {
  const [affiliates, setAffiliates] = useState<AffiliateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [payingAffiliate, setPayingAffiliate] = useState<AffiliateSummary | null>(null);
  const [paymentReference, setPaymentReference] = useState('');

  async function loadAffiliates() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/affiliates', { cache: 'no-store' });
      const result = await response.json() as { items?: AffiliateSummary[]; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể tải danh sách KOC.');
      setAffiliates(result.items ?? []);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải danh sách KOC.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAffiliates(); }, []);

  async function createAffiliate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...draft, affiliateCode: draft.affiliateCode.toUpperCase().trim(), commissionRate: Number(draft.commissionRate) }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể cấp tài khoản KOC.');
      setShowCreate(false);
      setDraft(emptyDraft);
      setMessage('Đã cấp tài khoản KOC. Hãy gửi mật khẩu cho KOC qua kênh an toàn.');
      await loadAffiliates();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cấp tài khoản KOC.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAffiliate(affiliate: AffiliateSummary) {
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/affiliates', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ affiliateId: affiliate.id, active: !affiliate.active }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể cập nhật trạng thái KOC.');
      setAffiliates((current) => current.map((item) => item.id === affiliate.id ? { ...item, active: !affiliate.active } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật trạng thái KOC.');
    }
  }

  async function settleCommission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payingAffiliate) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/affiliates/${encodeURIComponent(payingAffiliate.id)}/payout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentReference }),
      });
      const result = await response.json() as { payout?: { amount: number; orderCount: number }; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể ghi nhận quyết toán.');
      setMessage(`Đã ghi nhận chi ${formatCurrency(result.payout?.amount ?? 0)} cho ${result.payout?.orderCount ?? 0} đơn của ${payingAffiliate.affiliateCode}.`);
      setPayingAffiliate(null);
      setPaymentReference('');
      await loadAffiliates();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể ghi nhận quyết toán.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="affiliate-admin">
      <div className="affiliate-admin-toolbar">
        <div><strong>{affiliates.length}</strong><span> đối tác KOC</span></div>
        <button className="primary-action affiliate-primary-action" type="button" onClick={() => setShowCreate(true)}><Plus size={17} /> Cấp tài khoản KOC mới</button>
      </div>
      {message && <p className="affiliate-success" role="status"><Check size={16} />{message}</p>}
      {error && <p className="affiliate-error" role="alert">{error}</p>}
      <div className="affiliate-table-wrap">
        <table className="affiliate-table">
          <thead><tr><th>Tên KOC</th><th>Mã Ref</th><th>Tỷ lệ %</th><th>Tổng đơn chốt</th><th>Doanh thu mang về</th><th>Hoa hồng phải trả</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {affiliates.map((affiliate) => <tr key={affiliate.id}>
              <td><strong>{affiliate.name}</strong><small>{affiliate.email}</small><small>{affiliate.totalClicks.toLocaleString('vi-VN')} lượt click</small></td>
              <td><code>{affiliate.affiliateCode}</code></td>
              <td>{affiliate.commissionRate}%</td>
              <td>{affiliate.completedOrders.toLocaleString('vi-VN')}</td>
              <td>{formatCurrency(affiliate.revenue)}</td>
              <td><strong>{formatCurrency(affiliate.commissionDue)}</strong><small>Đã tích lũy {formatCurrency(affiliate.commission)}</small></td>
              <td><span className={`affiliate-status ${affiliate.active ? 'is-active' : 'is-suspended'}`}>{affiliate.active ? 'Đang hoạt động' : 'Tạm khóa'}</span></td>
              <td><div className="affiliate-row-actions">
                <button className="affiliate-settle-button" type="button" disabled={!affiliate.commissionDue} onClick={() => setPayingAffiliate(affiliate)}><Wallet size={15} /> Đối soát &amp; Thanh toán</button>
                <button className="affiliate-toggle-button" type="button" onClick={() => void toggleAffiliate(affiliate)}>{affiliate.active ? 'Tạm khóa' : 'Kích hoạt'}</button>
              </div></td>
            </tr>)}
            {!loading && !affiliates.length && <tr><td className="affiliate-empty-cell" colSpan={8}>Chưa có đối tác KOC.</td></tr>}
            {loading && <tr><td className="affiliate-empty-cell" colSpan={8}>Đang tải dữ liệu đối tác...</td></tr>}
          </tbody>
        </table>
      </div>

      {showCreate && <div className="affiliate-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowCreate(false); }}>
        <section className="affiliate-modal" role="dialog" aria-modal="true" aria-labelledby="affiliate-create-title">
          <header><div><p className="eyebrow">PARTNER ONBOARDING</p><h2 id="affiliate-create-title">Cấp tài khoản KOC mới</h2></div><button type="button" className="affiliate-modal-close" aria-label="Đóng" onClick={() => setShowCreate(false)}><X size={19} /></button></header>
          <form className="affiliate-form" onSubmit={createAffiliate}>
            <label>Tên KOC<input required maxLength={100} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <label>Email đăng nhập<input required type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></label>
            <label>Mật khẩu đăng nhập<input required type="password" autoComplete="new-password" minLength={6} maxLength={128} value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} /></label>
            <label>Mã định danh<input required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9_-]*" placeholder="TUTRINH_FOOD" value={draft.affiliateCode} onChange={(event) => setDraft((current) => ({ ...current, affiliateCode: event.target.value.toUpperCase() }))} /></label>
            <label>Tỷ lệ hoa hồng<select value={draft.commissionRate} onChange={(event) => setDraft((current) => ({ ...current, commissionRate: event.target.value }))}>{[10, 11, 12, 13, 14, 15].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}</select></label>
            <label className="affiliate-form-wide">Số tài khoản ngân hàng<input required inputMode="numeric" maxLength={34} value={draft.bankAccount} onChange={(event) => setDraft((current) => ({ ...current, bankAccount: event.target.value }))} /></label>
            {error && <p className="affiliate-error affiliate-form-wide" role="alert">{error}</p>}
            <footer className="affiliate-form-actions"><button className="secondary-action" type="button" onClick={() => setShowCreate(false)} disabled={saving}>Hủy</button><button className="primary-action affiliate-primary-action" type="submit" disabled={saving}><Handshake size={16} />{saving ? 'Đang cấp...' : 'Cấp tài khoản'}</button></footer>
          </form>
        </section>
      </div>}

      {payingAffiliate && <div className="affiliate-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPayingAffiliate(null); }}>
        <section className="affiliate-modal affiliate-payout-modal" role="dialog" aria-modal="true" aria-labelledby="affiliate-payout-title">
          <header><div><p className="eyebrow">PAYOUT REVIEW</p><h2 id="affiliate-payout-title">Đối soát &amp; thanh toán</h2></div><button type="button" className="affiliate-modal-close" aria-label="Đóng" onClick={() => setPayingAffiliate(null)}><X size={19} /></button></header>
          <p><strong>{payingAffiliate.name}</strong> · {payingAffiliate.affiliateCode}</p>
          <dl><div><dt>Tài khoản nhận</dt><dd>{payingAffiliate.bankAccount}</dd></div><div><dt>Số đơn cần quyết toán</dt><dd>{payingAffiliate.commissionDueOrders}</dd></div><div><dt>Hoa hồng phải trả</dt><dd><strong>{formatCurrency(payingAffiliate.commissionDue)}</strong></dd></div></dl>
          <form className="affiliate-form" onSubmit={settleCommission}>
            <label className="affiliate-form-wide">Mã tham chiếu giao dịch (không bắt buộc)<input maxLength={100} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} /></label>
            <p className="affiliate-payout-warning affiliate-form-wide">Chỉ xác nhận sau khi đã chuyển khoản. Các đơn trong đợt này sẽ được khóa để tránh chi trả trùng.</p>
            <footer className="affiliate-form-actions"><button className="secondary-action" type="button" onClick={() => setPayingAffiliate(null)} disabled={saving}>Hủy</button><button className="primary-action affiliate-primary-action" type="submit" disabled={saving}><Wallet size={16} />{saving ? 'Đang ghi nhận...' : 'Đã thanh toán'}</button></footer>
          </form>
        </section>
      </div>}
    </section>
  );
}