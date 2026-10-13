import Link from 'next/link';

export default function ThankYouPage({ searchParams }: { searchParams: { orderCode?: string } }) {
  return <main className="page-shell auth-shell"><section className="page-card auth-card"><p className="eyebrow">Mắc Khén Farm</p><h1>Cảm ơn bạn đã đặt hàng</h1><p>{searchParams.orderCode ? `Mã đơn hàng ${searchParams.orderCode} đã được ghi nhận.` : 'Thông tin đơn hàng đã được ghi nhận.'} Bạn có thể theo dõi trạng thái vận chuyển bất cứ lúc nào.</p><div className="hero-actions"><Link className="primary-action" href={`/tra-cuu${searchParams.orderCode ? `?orderCode=${encodeURIComponent(searchParams.orderCode)}` : ''}`}>Tra cứu đơn hàng</Link><Link className="secondary-action" href="/">Về trang chủ</Link></div></section></main>;
}