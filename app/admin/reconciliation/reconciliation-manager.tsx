'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Wallet } from 'lucide-react';

import type { ReconciliationItem } from './page';

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

export default function ReconciliationManager({ initialItems }: { initialItems: ReconciliationItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function runAction(item: ReconciliationItem, action: 'RECONCILE' | 'PREPARE_REFUND') {
    setBusyId(item.id);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/reconciliation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, orderCode: item.orderCode, ...(action === 'PREPARE_REFUND' ? { returnRequestId: item.returnRequest?.id } : {}) }),
      });
      const result = await response.json() as { error?: { message?: string }; message?: string; operation?: { status: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Không thể hoàn tất thao tác.');
      setMessage(result.message ?? (action === 'RECONCILE' ? `Đã đối soát ${item.orderCode} theo payment evidence đã xác thực.` : `Đã tạo lệnh hoàn tiền ${result.operation?.status ?? ''}.`));
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể hoàn tất thao tác.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="admin-reconciliation">
      {error && <p className="admin-return-alert" role="alert">{error}</p>}
      {message && <p className="admin-return-notice" role="status">{message}</p>}
      <div className="admin-reconciliation-summary"><Clock3 size={17} /><span>{initialItems.length} đơn thanh toán trực tuyến đang chờ xác minh quá 5 phút</span></div>
      <div className="admin-table-scroll">
        <table className="admin-reconciliation-table">
          <thead><tr><th>Đơn hàng</th><th>Khách hàng</th><th>Thanh toán</th><th>Số tiền</th><th>Thời gian chờ</th><th>Evidence</th><th>Thao tác</th></tr></thead>
          <tbody>{initialItems.map((item) => {
            const hasPaymentEvidence = item.payment?.status === 'PAID' && item.payment.amount === item.totalAmount || item.hasCachedPaymentEvidence;
            const refundReady = item.returnRequest?.status === 'REFUND_APPROVED'
              && Boolean(item.returnRequest.refundBankName && item.returnRequest.refundAccountNumber && item.returnRequest.refundAccountHolder);
            const waitingMinutes = Math.max(0, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000));
            return <tr key={item.id}>
              <td><strong>{item.orderCode}</strong><small className={item.orderStatus === 'CANCELLED' ? 'reconciliation-cancelled' : ''}>{item.orderStatus === 'CANCELLED' ? 'Đơn đã hủy' : 'Đang chờ thanh toán'}</small></td>
              <td>{item.customerName}<small><a href={`tel:${item.phone}`}>{item.phone}</a></small></td>
              <td>{item.paymentMethod}</td>
              <td><strong>{formatCurrency(item.totalAmount)}</strong></td>
              <td>{waitingMinutes} phút</td>
              <td>{hasPaymentEvidence ? <span className="reconciliation-evidence good"><CheckCircle2 size={15} /> Đã xác thực</span> : <span className="reconciliation-evidence missing"><AlertTriangle size={15} /> Chưa có</span>}{item.payment?.externalId && <small>{item.payment.externalId}</small>}</td>
              <td><div className="admin-reconciliation-actions">
                <button type="button" className="admin-reconciliation-primary" onClick={() => void runAction(item, 'RECONCILE')} disabled={busyId === item.id || !hasPaymentEvidence || item.orderStatus === 'CANCELLED'} title={!hasPaymentEvidence ? 'Chưa có payment record hoặc webhook đã xác thực' : undefined}>
                  <RefreshCw size={15} /> Đối soát T+0
                </button>
                {refundReady && <button type="button" className="admin-reconciliation-refund" onClick={() => void runAction(item, 'PREPARE_REFUND')} disabled={busyId === item.id}>
                  <Wallet size={15} /> Lập lệnh hoàn
                </button>}
              </div></td>
            </tr>;
          })}
          {!initialItems.length && <tr><td colSpan={7}>Không có đơn thanh toán trực tuyến nào quá hạn tra soát.</td></tr>}</tbody>
        </table>
      </div>
      <p className="admin-reconciliation-note">Đối soát chỉ cập nhật từ payment record/webhook khớp số tiền. Lệnh hoàn tiền được ghi nhận ở trạng thái chờ phê duyệt; thao tác chuyển khoản thực tế phải do người có thẩm quyền xác nhận.</p>
    </div>
  );
}
