import Link from 'next/link';
import { fetchApiWithFallback } from '@/lib/server-api';
import { formatCurrency } from '@/lib/store-data';
import CroFunnelWidget from './cro-funnel-widget';
import RevenueTrendChart, { type RevenueTrendPoint } from './revenue-trend-chart';

type ReportData = {
  netRevenue: number;
  orders: number;
  paidOrders: number;
  averageOrderValue: number;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  costCoveragePercent: number;
  repeatCustomerRate: number | null;
  repeatCustomers: number;
  uniqueCustomers: number;
  lowStockProducts: { id: string; name: string; stock: number; unit: string | null }[];
  revenueTrend: { weekly: RevenueTrendPoint[]; monthly: RevenueTrendPoint[] };
  stockForecast: { id: string; name: string; stock: number; unit: string | null; unitsSold30Days: number; averageDailyUnits: number; daysRemaining: number | null }[];
  partialMetrics: string[];
};

export default async function AdminReportsPage() {
  const fallback: ReportData = {
    netRevenue: 0, orders: 0, paidOrders: 0, averageOrderValue: 0, grossProfit: null,
    grossMarginPercent: null, costCoveragePercent: 0, repeatCustomerRate: null,
    repeatCustomers: 0, uniqueCustomers: 0, lowStockProducts: [],
    revenueTrend: { weekly: [], monthly: [] }, stockForecast: [], partialMetrics: [],
  };
  const { data: report, unavailable } = await fetchApiWithFallback<ReportData>('/api/admin/reports/overview', fallback);
  const depletionWarnings = report.stockForecast.filter((product) => product.daysRemaining !== null && product.daysRemaining <= 14);
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
          <Link href="/admin/reports">Báo cáo</Link>
        </nav>
      </header>

      <section className="page-card">
        {unavailable && <p className="empty-state" role="status">Không thể tải báo cáo vì cơ sở dữ liệu hiện không khả dụng.</p>}
        {!unavailable && report.partialMetrics.length > 0 && <p className="empty-state" role="status">Một số chỉ số chưa tải được: {report.partialMetrics.join(', ')}.</p>}
        <div className="page-title">
          <div>
            <p className="eyebrow">Báo cáo</p>
            <h2>Báo cáo doanh thu &amp; chuyển đổi</h2>
          </div>
        </div>

        <div className="stats-grid admin-report-kpis">
          <article className="stat-card"><span>Doanh thu thuần</span><strong>{formatCurrency(report.netRevenue)}</strong></article>
          <article className="stat-card"><span>Biên lợi nhuận gộp</span><strong>{report.grossMarginPercent === null ? 'Chưa đủ dữ liệu giá vốn' : `${report.grossMarginPercent}%`}</strong><small>{report.grossProfit === null ? `Độ phủ giá vốn ${report.costCoveragePercent}%` : `Lợi nhuận gộp ${formatCurrency(report.grossProfit)}`}</small></article>
          <article className="stat-card"><span>Giá trị đơn trung bình</span><strong>{formatCurrency(report.averageOrderValue)}</strong><small>{report.paidOrders.toLocaleString('vi-VN')} đơn đã thanh toán</small></article>
          <article className="stat-card"><span>Tỷ lệ khách mua lại</span><strong>{report.repeatCustomerRate === null ? '—' : `${report.repeatCustomerRate}%`}</strong><small>{report.repeatCustomers} / {report.uniqueCustomers} khách hàng</small></article>
        </div>
        <RevenueTrendChart weekly={report.revenueTrend.weekly} monthly={report.revenueTrend.monthly} />
        <section className="admin-report-panel stock-forecast-panel" aria-labelledby="stock-forecast-title">
          <header className="admin-report-panel-header"><div><p className="eyebrow">TỐC ĐỘ TIÊU THỤ 30 NGÀY</p><h3 id="stock-forecast-title">Dự báo nhập hàng</h3></div><span>{depletionWarnings.length} sản phẩm cần theo dõi trong 14 ngày</span></header>
          <div className="mobile-table-scroll"><table className="admin-stock-forecast-table"><thead><tr><th>Sản phẩm</th><th>Tồn hiện tại</th><th>Đã bán / 30 ngày</th><th>Trung bình / ngày</th><th>Dự kiến hết hàng</th></tr></thead>
            <tbody>{report.stockForecast.map((product) => <tr key={product.id} className={product.daysRemaining !== null && product.daysRemaining <= 14 ? 'is-forecast-warning' : ''}>
              <td>{product.name}</td><td>{product.stock} {product.unit ?? ''}</td><td>{product.unitsSold30Days}</td><td>{product.averageDailyUnits}</td><td>{product.daysRemaining === null ? 'Ổn định' : `${product.daysRemaining} ngày`}</td>
            </tr>)}
              {!report.stockForecast.length && <tr><td colSpan={5}>Chưa có dữ liệu bán hàng trong 30 ngày gần nhất.</td></tr>}
            </tbody></table></div>
          <p className="monitoring-footnote">Ước tính theo số lượng trong đơn đã thanh toán chia cho 30 ngày; chưa tính kế hoạch sản xuất hoặc lô đang nhập.</p>
        </section>
        <CroFunnelWidget />
      </section>
    </main>
  );
}
