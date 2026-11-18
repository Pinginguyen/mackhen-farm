import Link from 'next/link';

import { fetchApiWithFallback } from '@/lib/server-api';
import ReconciliationManager from './reconciliation-manager';

export const dynamic = 'force-dynamic';

export type ReconciliationItem = {
  id: string;
  orderCode: string;
  customerName: string;
  phone: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  totalAmount: number;
  createdAt: string;
  holdExpiresAt: string | null;
  reconciled: boolean;
  hasCachedPaymentEvidence: boolean;
  payment: { id: string; status: string; amount: number; externalId: string | null; createdAt: string } | null;
  returnRequest: { id: string; status: string; refundBankName: string | null; refundAccountNumber: string | null; refundAccountHolder: string | null } | null;
};

export type BankTransferItem = {
  id: string;
  transactionId: string | null;
  orderCode: string | null;
  amount: number;
  content: string;
  status: string;
  mismatchReason: string | null;
  receivedAt: string;
  order: { orderCode: string; totalAmount: number; customerName: string } | null;
};

export type ReconciliationSummary = { todayReceived: number; weekReceived: number; todayMatched: number; weekPaidOrders: number };

export default async function AdminReconciliationPage() {
  const { data, unavailable } = await fetchApiWithFallback<{ items: ReconciliationItem[]; bankTransfers: BankTransferItem[]; summary: ReconciliationSummary; providerLookup: string; message: string }>('/api/admin/reconciliation', {
    items: [], bankTransfers: [], summary: { todayReceived: 0, weekReceived: 0, todayMatched: 0, weekPaidOrders: 0 }, providerLookup: 'unknown', message: 'Không thể tải dữ liệu đối soát.',
  });

  return (
    <main className="page-shell">
      <section className="page-card">
        <div className="page-title">
          <div><p className="eyebrow">Thanh toán & phục hồi giao dịch</p><h1>Đối soát T+0</h1></div>
          <Link className="secondary-action" href="/admin/orders">Đơn hàng</Link>
        </div>
        {unavailable && <p className="empty-state" role="status">Không thể tải danh sách đối soát khi cơ sở dữ liệu chưa kết nối.</p>}
        <p className="admin-reconciliation-disclosure">{data.message} Không xác nhận thanh toán chỉ dựa trên số tiền do khách gửi.</p>
        <ReconciliationManager initialItems={data.items} initialTransfers={data.bankTransfers} summary={data.summary} />
      </section>
    </main>
  );
}