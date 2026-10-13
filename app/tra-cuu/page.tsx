import Link from 'next/link';

import TrackingForm from './tracking-form';

export const dynamic = 'force-dynamic';

export default function TrackingPage() {
  return <main className="page-shell"><header className="topbar"><div className="brand-wrap"><span className="brand-badge">M</span><div><p className="eyebrow">Mắc Khén Farm</p><h1>Tra cứu đơn hàng</h1></div></div><nav className="main-nav"><Link href="/">Trang chủ</Link><Link href="/products">Sản phẩm</Link><Link href="/tai-khoan">Tài khoản</Link></nav></header><section className="page-card"><p className="eyebrow">Theo dõi giao hàng</p><h2>Đơn hàng của bạn đang ở đâu?</h2><TrackingForm /></section></main>;
}