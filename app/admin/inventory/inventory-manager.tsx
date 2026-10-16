'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, PauseCircle, Plus, RefreshCw } from 'lucide-react';

type Lot = {
  id: string;
  lotCode: string;
  mfgDate: string;
  expDate: string;
  receivedQty: number;
  availableQty: number;
  status: string;
  testReportUrl: string | null;
  receivingNote: string | null;
};

type InventoryItem = { id: string; name: string; stock: number; status: string; active: boolean; productionLots: Lot[] };

const statusLabels: Record<string, string> = { ACTIVE: 'Đang hoạt động', LOW_STOCK: 'Sắp hết', RECALLED: 'Đã tạm dừng', EXPIRED: 'Hết hạn' };

export default function InventoryManager({ initialInventory }: { initialInventory: InventoryItem[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(initialInventory[0]?.id ?? '');
  const [lotCode, setLotCode] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [receivedQty, setReceivedQty] = useState(1);
  const [testReportUrl, setTestReportUrl] = useState('');
  const [receivingNote, setReceivingNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [affectedCustomers, setAffectedCustomers] = useState<{ orderCode: string; customerName: string; phone: string }[]>([]);

  async function createLot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setAffectedCustomers([]);
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_LOT', productId, lotCode, mfgDate, expDate, receivedQty, testReportUrl, receivingNote }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể tạo lô sản xuất.');
      setMessage(`Đã nhập lô ${lotCode.trim().toUpperCase()}.`);
      setLotCode('');
      setReceivingNote('');
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo lô sản xuất.');
    } finally {
      setBusy(false);
    }
  }

  async function pauseLot(code: string) {
    if (!window.confirm(`Tạm dừng lô ${code} và ẩn sản phẩm liên quan khỏi cửa hàng?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    setAffectedCustomers([]);
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'PAUSE_LOT', lotCode: code }),
      });
      const result = await response.json() as { error?: { message?: string }; affectedCustomers?: { orderCode: string; customerName: string; phone: string }[] };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể tạm dừng lô.');
      setMessage(`Đã tạm dừng ${code}. Danh sách khách mua lô đã được truy xuất.`);
      setAffectedCustomers(result.affectedCustomers ?? []);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạm dừng lô.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-inventory-manager">
      <section className="admin-panel" aria-labelledby="inventory-create-lot-title">
        <header><div><p className="eyebrow">Truy xuất nguồn gốc</p><h3 id="inventory-create-lot-title">Nhập lô sản xuất</h3></div><Plus size={18} aria-hidden="true" /></header>
        <form className="admin-lot-form" onSubmit={createLot}>
          <label>Sản phẩm<select required value={productId} onChange={(event) => setProductId(event.target.value)}>{initialInventory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Mã lô<input required value={lotCode} onChange={(event) => setLotCode(event.target.value)} placeholder="LOT-MKF-2026-001" maxLength={64} /></label>
          <label>Ngày sản xuất<input required type="date" value={mfgDate} onChange={(event) => setMfgDate(event.target.value)} /></label>
          <label>Hạn sử dụng<input required type="date" value={expDate} onChange={(event) => setExpDate(event.target.value)} /></label>
          <label>Số lượng nhập<input required type="number" min={1} step={1} value={receivedQty} onChange={(event) => setReceivedQty(Number(event.target.value))} /></label>
          <label>Link CoA kiểm nghiệm<input type="url" value={testReportUrl} onChange={(event) => setTestReportUrl(event.target.value)} placeholder="https://..." /></label>
          <label className="admin-lot-note">Ghi chú nhập kho<textarea rows={2} maxLength={2000} value={receivingNote} onChange={(event) => setReceivingNote(event.target.value)} /></label>
          <button className="admin-save-btn" type="submit" disabled={busy || !initialInventory.length}><Plus size={15} /> Tạo lô</button>
        </form>
      </section>

      {error && <p className="admin-return-alert" role="alert">{error}</p>}
      {message && <p className="admin-return-notice" role="status">{message}</p>}
      {affectedCustomers.length > 0 && <section className="admin-panel" aria-label="Khách hàng đã mua lô bị tạm dừng">
        <header><div><p className="eyebrow">Chủ động CSKH</p><h3>Khách đã mua lô bị tạm dừng</h3></div><strong>{affectedCustomers.length}</strong></header>
        <div className="admin-table-scroll"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Điện thoại</th></tr></thead><tbody>{affectedCustomers.map((customer) => <tr key={`${customer.orderCode}-${customer.phone}`}><td>{customer.orderCode}</td><td>{customer.customerName}</td><td><a href={`tel:${customer.phone}`}>{customer.phone}</a></td></tr>)}</tbody></table></div>
      </section>}

      <section className="table-card mobile-table-scroll" aria-label="Tồn kho và lô sản xuất">
        <table>
          <thead><tr><th>Sản phẩm</th><th>Tồn hệ thống</th><th>Trạng thái</th><th>Lô sản xuất / khả dụng</th></tr></thead>
          <tbody>{initialInventory.map((item) => <tr key={item.id}>
            <td><strong>{item.name}</strong></td>
            <td><strong className={item.stock < 10 ? 'inventory-critical' : ''}>{item.stock}</strong>{item.stock < 10 && <span className="inventory-warning"><AlertTriangle size={13} /> Dưới 10</span>}</td>
            <td>{item.active ? 'Đang bán' : 'Đã ẩn'}</td>
            <td><div className="admin-lot-list">{item.productionLots.length ? item.productionLots.map((lot) => <div className="admin-lot-row" key={lot.id}>
              <span><strong>{lot.lotCode}</strong><small>{lot.availableQty}/{lot.receivedQty} khả dụng · HSD {new Date(lot.expDate).toLocaleDateString('vi-VN')}</small>{lot.testReportUrl && <a href={lot.testReportUrl} target="_blank" rel="noreferrer">Hồ sơ kiểm nghiệm</a>}</span>
              <span className={`admin-lot-status ${lot.status.toLowerCase()}`}>{statusLabels[lot.status] ?? lot.status}</span>
              {lot.status !== 'RECALLED' && lot.status !== 'EXPIRED' && <button type="button" className="admin-lot-pause" disabled={busy} onClick={() => void pauseLot(lot.lotCode)} title="Tạm dừng lô và ẩn sản phẩm"><PauseCircle size={15} /> Tạm dừng lô</button>}
            </div>) : <span>Chưa khai báo lô</span>}</div></td>
          </tr>)}
          {!initialInventory.length && <tr><td colSpan={4}>Chưa có dữ liệu tồn kho.</td></tr>}</tbody>
        </table>
      </section>
      <p className="admin-inventory-note"><RefreshCw size={15} /> Hàng chờ thanh toán được giữ tối đa 15 phút; cron hoàn kho chạy mỗi 5 phút.</p>
    </div>
  );
}
