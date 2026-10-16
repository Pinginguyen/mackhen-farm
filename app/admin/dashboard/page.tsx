import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ClipboardList, Package, RotateCcw, Wallet } from 'lucide-react';

import { fetchApiWithFallback } from '@/lib/server-api';
import { formatCurrency } from '@/lib/store-data';

const dashboardMetricLabels: Record<string, string> = {
  'paid-summary': 'doanh thu và giá trị đơn trung bình',
  'cancelled-deductions': 'khấu trừ đơn hủy',
  refunds: 'hoàn tiền',
  'order-status-counts': 'tổng số và trạng thái đơn',
  'low-stock-products': 'tồn kho thấp',
  'current-period-revenue': 'doanh thu 30 ngày',
  'previous-period-revenue': 'doanh thu kỳ trước',
  'recent-orders': 'đơn hàng gần đây',
};

export default async function AdminDashboardPage() {
  const [{ data: report, unavailable }, { data: returnData, unavailable: returnsUnavailable }, { data: health, unavailable: healthUnavailable }] = await Promise.all([
    fetchApiWithFallback<{
    revenue: number;
    grossSales: number;
    cancelledDeductions: number;
    refundDeductions: number;
    marketplaceFees: number | null;
    netRevenue: number;
    orders: number;
    paidOrders: number;
    averageOrderValue: number;
    pending: number;
    gmvGrowthPercent: number | null;
    deliverySuccessRate: number | null;
    cancelledRate: number | null;
    lowStock: number;
    partialMetrics?: string[];
    lowStockProducts: { id: string; name: string; stock: number; unit: string | null }[];
    recentOrders: { orderCode: string; customerName: string; phone: string; totalAmount: number; orderStatus: string; paymentMethod: string; paymentStatus: string; createdAt: string }[];
    }>('/api/admin/reports/overview', {
    revenue: 0, grossSales: 0, cancelledDeductions: 0, refundDeductions: 0, marketplaceFees: null, netRevenue: 0,
    orders: 0, paidOrders: 0, averageOrderValue: 0, pending: 0, gmvGrowthPercent: null,
    deliverySuccessRate: null, cancelledRate: null, lowStock: 0, lowStockProducts: [], recentOrders: [],
    }),
    fetchApiWithFallback<{ items: { id: string; status: string; issueType: string; createdAt: string; order: { orderCode: string; customerName: string } }[] }>('/api/returns', { items: [] }),
    fetchApiWithFallback<{
      database: string;
      databaseLatencyMs: number | null;
      connectionPooler: string;
      api: { sampleCount: number; averageLatencyMs: number | null; errors500: number; errors504: number; errorRate5xxPercent: number | null; windowMinutes: number };
    }>('/api/admin/monitoring', {
      database: 'unavailable', databaseLatencyMs: null, connectionPooler: 'unknown',
      api: { sampleCount: 0, averageLatencyMs: null, errors500: 0, errors504: 0, errorRate5xxPercent: null, windowMinutes: 15 },
    }),
  ]);
  const urgentReturns = returnData.items.filter((item) => item.status === 'PENDING').slice(0, 3);
  const statusLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PAID: 'Đã thanh toán', PROCESSING: 'Đang đóng gói', HANDED_OFF: 'Đã bàn giao 3PL', IN_TRANSIT: 'Đang giao', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' };
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
        {!unavailable && report.partialMetrics?.length ? <p className="empty-state" role="status">Một số chỉ số chưa tải được: {report.partialMetrics.map((metric) => dashboardMetricLabels[metric] ?? metric).join(', ')}. Các chỉ số còn lại vẫn được cập nhật.</p> : null}
        {returnsUnavailable && <p className="empty-state" role="status">Chưa thể đồng bộ yêu cầu đổi trả.</p>}
        <div className="page-title">
          <div>
            <p className="eyebrow">Tổng quan kinh doanh</p>
            <h2>Hoạt động cửa hàng</h2>
          </div>
          <Link className="secondary-action" href="/admin/reports">Báo cáo chi tiết</Link>
        </div>

        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <div className="admin-summary-heading"><span>Doanh số thô · GMV</span><span className="admin-summary-icon revenue"><Wallet size={19} aria-hidden="true" /></span></div>
            <strong>{formatCurrency(report.grossSales)}</strong>
            <small className={report.gmvGrowthPercent != null && report.gmvGrowthPercent >= 0 ? 'is-positive' : 'is-neutral'}>
              {report.gmvGrowthPercent == null ? 'Kỳ trước: chưa có dữ liệu' : <>{report.gmvGrowthPercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(report.gmvGrowthPercent).toFixed(1)}% so với 30 ngày trước</>}
            </small>
          </article>
          <article className="admin-summary-card">
            <div className="admin-summary-heading"><span>Đơn hàng</span><span className="admin-summary-icon orders"><ClipboardList size={19} aria-hidden="true" /></span></div>
            <strong>{report.orders.toLocaleString('vi-VN')} đơn</strong>
            <small>{report.pending} đơn đang chờ xử lý</small>
          </article>
          <article className="admin-summary-card">
            <div className="admin-summary-heading"><span>RTO tham chiếu</span><span className="admin-summary-icon returns"><RotateCcw size={19} aria-hidden="true" /></span></div>
            <strong>{report.cancelledRate == null ? '—' : `${report.cancelledRate.toFixed(1)}%`}</strong>
            <small>Tỷ lệ đơn hủy trên đơn đã đóng</small>
          </article>
          <article className="admin-summary-card">
            <div className="admin-summary-heading"><span>Giao thành công</span><span className="admin-summary-icon delivery"><CheckCircle2 size={19} aria-hidden="true" /></span></div>
            <strong>{report.deliverySuccessRate == null ? '—' : `${report.deliverySuccessRate.toFixed(1)}%`}</strong>
            <small>Mục tiêu vận hành trên 97%</small>
          </article>
        </div>

        <section className="admin-financial-strip" aria-label="Đối chiếu doanh thu thực tế">
          <div><span>Khoản trừ đã ghi nhận</span><strong>{formatCurrency(report.cancelledDeductions + report.refundDeductions)}</strong></div>
          <div><span>Hủy / hoàn tiền</span><strong>{formatCurrency(report.cancelledDeductions)} / {formatCurrency(report.refundDeductions)}</strong></div>
          <div><span>Doanh thu net đã ghi nhận</span><strong>{formatCurrency(report.netRevenue)}</strong><small>Phí/thuế {report.marketplaceFees == null ? 'chưa tích hợp' : formatCurrency(report.marketplaceFees)}</small></div>
        </section>

        <section className="admin-panel admin-system-health-widget" aria-labelledby="admin-system-health-title">
          <header><div><p className="eyebrow">Giám sát hạ tầng</p><h3 id="admin-system-health-title">System health</h3></div><Link href="/admin/monitoring">Chi tiết giám sát <ArrowUpRight size={15} /></Link></header>
          {healthUnavailable && <p role="status">Không thể đọc trạng thái hệ thống hiện tại.</p>}
          <div className="admin-health-inline-grid">
            <div><span>API trung bình</span><strong>{health.api.averageLatencyMs == null ? '—' : `${health.api.averageLatencyMs} ms`}</strong></div>
            <div><span>Lỗi 500 / 504</span><strong>{health.api.errors500} / {health.api.errors504}</strong></div>
            <div><span>Neon PostgreSQL</span><strong className={health.database === 'healthy' ? 'health-good' : 'health-bad'}>{health.database === 'healthy' ? 'Kết nối tốt' : 'Không khả dụng'}</strong></div>
            <div><span>Connection pooler</span><strong>{health.connectionPooler === 'pooler-configured' ? 'Đã phát hiện' : 'Chưa phát hiện'}</strong></div>
          </div>
        </section>

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

        <section className="admin-panel admin-urgent-returns">
          <header><div><p className="eyebrow">Ưu tiên CSKH</p><h3>Đổi trả / bảo hành cần xử lý</h3></div><span className="admin-count-badge warning">{urgentReturns.length}</span></header>
          {urgentReturns.length ? <ul>{urgentReturns.map((request) => <li key={request.id}><span><strong>{request.order.orderCode}</strong><small>{request.order.customerName} · {request.issueType}</small></span><time>{new Date(request.createdAt).toLocaleDateString('vi-VN')}</time></li>)}</ul> : <p>Không có yêu cầu đang chờ xử lý.</p>}
          <Link href="/admin/returns">Mở trung tâm đổi trả <ArrowUpRight size={15} /></Link>
        </section>
      </section>
    </main>
  );
}
