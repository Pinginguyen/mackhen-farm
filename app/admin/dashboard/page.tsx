import Link from 'next/link';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ClipboardList, Package, Wallet } from 'lucide-react';

import { fetchApiWithFallback } from '@/lib/server-api';
import { formatCurrency } from '@/lib/store-data';

export default async function AdminDashboardPage() {
  const { data: report, unavailable } = await fetchApiWithFallback<{
    revenue: number;
    orders: number;
    paidOrders: number;
    averageOrderValue: number;
    pending: number;
    gmvGrowthPercent: number | null;
    deliverySuccessRate: number | null;
    cancelledRate: number | null;
    lowStock: number;
    lowStockProducts: { id: string; name: string; stock: number; unit: string | null }[];
    recentOrders: { orderCode: string; customerName: string; phone: string; totalAmount: number; orderStatus: string; paymentMethod: string; paymentStatus: string; createdAt: string }[];
  }>('/api/admin/reports/overview', {
    revenue: 0, orders: 0, paidOrders: 0, averageOrderValue: 0, pending: 0, gmvGrowthPercent: null,
    deliverySuccessRate: null, cancelledRate: null, lowStock: 0, lowStockProducts: [], recentOrders: [],
  });
  const statusLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang đóng gói', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' };
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-badge">M</span>
          <div>
            <p className="eyebrow">Mắc Khén Farm Admin</p>
            <h1>Mắc Khén Farm</h1>
          </div>
        </div>
        <nav className="main-nav" aria-label="Menu quản trị">
          <Link href="/admin/dashboard">Dashboard</Link>
          <Link href="/admin/products">Sản phẩm</Link>
          <Link href="/admin/orders">Đơn hàng</Link>
          <Link href="/admin/inventory">Tồn kho</Link>
          <Link href="/admin/reports">Báo cáo</Link>
        </nav>
      </header>

      <section className="admin-dashboard">
        {unavailable && <p className="empty-state" role="status">Không thể tải báo cáo vì cơ sở dữ liệu hiện không khả dụng.</p>}
        <div className="page-title">
          <div>
            <p className="eyebrow">Tổng quan kinh doanh</p>
            <h2>Hoạt động cửa hàng</h2>
          </div>
          <Link className="secondary-action" href="/admin/reports">Báo cáo chi tiết</Link>
        </div>

        <div className="admin-kpi-grid">
          <article className="admin-kpi-card"><span><Wallet size={17} /> Tổng doanh thu · GMV</span><strong>{formatCurrency(report.revenue)}</strong><small>{report.gmvGrowthPercent == null ? 'Chưa đủ dữ liệu so sánh 30 ngày' : <>{report.gmvGrowthPercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(report.gmvGrowthPercent).toFixed(1)}% so với 30 ngày trước</>}</small></article>
          <article className="admin-kpi-card"><span><ClipboardList size={17} /> Giá trị đơn hàng · AOV</span><strong>{formatCurrency(report.averageOrderValue)}</strong><small>Từ {report.paidOrders} đơn đã thanh toán</small></article>
          <article className="admin-kpi-card"><span><CheckCircle2 size={17} /> Giao hàng thành công</span><strong>{report.deliverySuccessRate == null ? '—' : `${report.deliverySuccessRate.toFixed(1)}%`}</strong><small>Mục tiêu vận hành: trên 97%</small></article>
          <article className="admin-kpi-card"><span><AlertTriangle size={17} /> Hủy đơn · RTO tham chiếu</span><strong>{report.cancelledRate == null ? '—' : `${report.cancelledRate.toFixed(1)}%`}</strong><small>Mục tiêu dưới 2,8% · dùng đơn hủy làm proxy</small></article>
        </div>

        <div className="admin-operations-grid">
          <section className="admin-panel">
            <header><div><p className="eyebrow">Cần xử lý ngay</p><h3>Đơn mới chưa xác nhận</h3></div><span className="admin-count-badge">{report.pending}</span></header>
            <p>{report.pending ? `${report.pending} đơn đang chờ đội vận hành xác nhận.` : 'Không có đơn mới đang chờ xác nhận.'}</p>
            <Link href="/admin/orders?status=PENDING">Mở danh sách đơn <ArrowUpRight size={15} /></Link>
          </section>
          <section className="admin-panel">
            <header><div><p className="eyebrow">Bổ sung hàng hóa</p><h3>Tồn kho dưới 30 đơn vị</h3></div><span className="admin-count-badge warning">{report.lowStock}</span></header>
            {report.lowStockProducts.length ? <ul className="admin-low-stock-list">{report.lowStockProducts.slice(0, 4).map((product) => <li key={product.id}><span><Package size={15} />{product.name}</span><strong>{product.stock} còn</strong></li>)}</ul> : <p>Chưa có sản phẩm nào dưới ngưỡng tồn kho.</p>}
            <p className="admin-reorder-note">Gợi ý kiểm tra nguyên liệu bã đậu và gia vị trước mẻ sản xuất tiếp theo.</p>
            <Link href="/admin/products">Quản lý sản phẩm &amp; kho <ArrowUpRight size={15} /></Link>
          </section>
        </div>

        <section className="admin-panel admin-latest-orders">
          <header><div><p className="eyebrow">Mới nhất</p><h3>5 đơn hàng gần đây</h3></div><Link href="/admin/orders">Tất cả đơn hàng <ArrowUpRight size={15} /></Link></header>
          <div className="admin-table-scroll"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Thanh toán</th><th>Trạng thái</th><th>Giá trị</th><th>Thời gian</th></tr></thead><tbody>
            {report.recentOrders.map((order) => <tr key={order.orderCode}><td><Link href={`/admin/orders?search=${encodeURIComponent(order.orderCode)}`}>{order.orderCode}</Link></td><td>{order.customerName}<small>{order.phone}</small></td><td><span className={`admin-payment-badge ${order.paymentMethod.toLowerCase()}`}>{order.paymentMethod === 'VIETQR' ? 'VietQR' : order.paymentMethod === 'MOMO' ? 'MoMo' : 'COD'} · {order.paymentStatus === 'PAID' ? 'Đã trả' : 'Chưa trả'}</span></td><td><span className={`admin-status-badge status-${order.orderStatus.toLowerCase()}`}>{statusLabels[order.orderStatus] ?? order.orderStatus}</span></td><td>{formatCurrency(order.totalAmount)}</td><td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td></tr>)}
            {!report.recentOrders.length && <tr><td colSpan={6}>Chưa có đơn hàng.</td></tr>}
          </tbody></table></div>
        </section>
      </section>
    </main>
  );
}
